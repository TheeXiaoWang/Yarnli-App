import * as THREE from 'three'
import { nearestPointOnPolyline } from '../../components/measurements/utils'
import { enforceStepContinuity } from '../../utils/nodes/scaffold'

const DEV = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || false

function makeBasis(center, up) {
	const C = new THREE.Vector3(center[0], center[1], center[2])
	const n = new THREE.Vector3(up[0], up[1], up[2]).normalize()
	let u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
	u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
	const v = new THREE.Vector3().crossVectors(n, u)
	return { C, n, u, v }
}

function angleOf(p, basis) {
	const { C, u, v } = basis
	const P = new THREE.Vector3(p[0], p[1], p[2])
	const d = P.clone().sub(C)
	const x = d.dot(u)
	const y = d.dot(v)
	return Math.atan2(y, x)
}

function normAngle(a) { while (a <= -Math.PI) a += 2*Math.PI; while (a > Math.PI) a -= 2*Math.PI; return a }

function sortByTheta(nodes, basis) {
	return nodes
		.map((n, i) => ({ i, p: n.p, th: angleOf(n.p, basis) }))
		.sort((a, b) => a.th - b.th)
}

function rotateIndex(n, start, i) { return (start + i) % n }

function bestStartByBlockCenters(Pth, Cth, quotas) {
	const n = Cth.length
	const rot = (k) => Cth[(k % n + n) % n]
	const costFor = (s) => {
		let pos = 0, total = 0
		for (let i = 0; i < Pth.length; i++) {
			const k = quotas[i]
			let a = rot(s + pos)
			let b = rot(s + pos + k - 1)
			if (b < a) b += 2 * Math.PI
			const mid = (a + b) * 0.5
			let p = Pth[i]
			while (p - mid > Math.PI) p -= 2 * Math.PI
			while (mid - p > Math.PI) p += 2 * Math.PI
			total += Math.abs(p - mid)
			pos += k
		}
		return total
	}
	let bestS = 0, best = Infinity
	const tries = Math.min(n, 8)
	for (let s = 0; s < tries; s++) {
		const c = costFor(s)
		if (c < best) { best = c; bestS = s }
	}
	return bestS
}

function pickEvenParents(m, extra, offset = 0) {
	// Bresenham-style even distribution across m slots
	const sel = []
	let acc = ((offset % m) + m) % m
	const step = m / Math.max(1, extra)
	for (let k = 0; k < extra; k++) {
		sel.push(Math.floor(acc) % m)
		acc += step
	}
	// Ensure uniqueness (handle rare float ties)
	const used = new Set()
	for (let i = 0; i < sel.length; i++) {
		let j = sel[i] % m
		while (used.has(j)) j = (j + 1) % m
		sel[i] = j
		used.add(j)
	}
	return sel
}

function devReportInvariants({ m, n, policy, parentToChildren, C, start }) {
	if (!DEV) return
	let violations = 0
	if (n >= m) {
		// every child used exactly once
		const used = new Array(n).fill(0)
		const posByChild = new Map()
		for (let k = 0; k < n; k++) posByChild.set(C[k].i, k)
		for (let i = 0; i < m; i++) {
			for (const child of parentToChildren[i]) {
				const pos = posByChild.get(child)
				if (typeof pos === 'number') used[(pos - start + n) % n]++
			}
		}
		if (!used.every(c => c === 1)) violations++
		// quotas in {1,2} and adjacency for 2
		let twos = 0
		for (let i = 0; i < m; i++) {
			const len = parentToChildren[i]?.length || 0
			if (!(len === 1 || len === 2)) violations++
			if (len === 2) {
				twos++
				const aPos = (posByChild.get(parentToChildren[i][0]) - start + n) % n
				const bPos = (posByChild.get(parentToChildren[i][1]) - start + n) % n
				if (bPos !== (aPos + 1) % n) violations++
			}
		}
		if (twos !== (n - m)) violations++
	} else {
		// no child has >2 parents and exactly decs twos
		const decs = m - n
		const counts = new Array(n).fill(0)
		const posByChild = new Map()
		for (let k = 0; k < n; k++) posByChild.set(C[k].i, k)
		for (let i = 0; i < m; i++) for (const child of parentToChildren[i]) {
			const pos = posByChild.get(child)
			if (typeof pos === 'number') counts[(pos - start + n) % n]++
		}
		if (!counts.every(c => c === 1 || c === 2)) violations++
		const twos = counts.filter(c => c === 2).length
		if (twos !== decs) violations++
	}
	// eslint-disable-next-line no-console
	console.log('[Scaffold V3] invariants', { m, n, policy, violations })
}

export function buildStepV3({
	currentNodes,
	layer,
	yNext,
	rNext,
	nextCount,
	center,
	up,
	distributeNextNodes,
	prevSegments = null,
	increasePolicy = 'spread_out',
	snapToPolyline = true,
}) {
	const basis = makeBasis(center, up)
	let { nodes: nextNodes } = distributeNextNodes({ yNext, rNext, nextCount, center, up })

	const curN = currentNodes.length
	const nxtN = nextNodes.length
	if (curN === 0 || nxtN === 0) return { segments: [], nextCurrentNodes: [], parentToChildren: [], status: 'empty' }

	// Sort by theta and pick rotation so child[0] is closest to parent[0]
	const P = sortByTheta(currentNodes, basis)
	const C = sortByTheta(nextNodes, basis)
	const parentAngles = P.map(x => x.th)
	const childAngles = C.map(x => x.th)
	let start = 0
	{
		let best = 0, bestD = Infinity
		for (let i = 0; i < nxtN; i++) {
			const d = Math.abs(normAngle(parentAngles[0] - childAngles[i]))
			if (d < bestD) { bestD = d; best = i }
		}
		start = best
	}

	// Baseline 1:1 anchors (single scaffolds) – build the backbone first
	const minMN = Math.min(curN, nxtN)
	const parentToChildrenBaseline = Array.from({ length: curN }, () => [])
	for (let k = 0; k < minMN; k++) {
		const parentIdx = P[k].i
		const childIdx = C[(start + k) % nxtN].i
		parentToChildrenBaseline[parentIdx].push(childIdx)
	}

	// If counts equal, we are done – return the baseline single-scaffold mapping
	if (curN === nxtN) {
		// Build segments from baseline
		const segments = []
		for (let j = 0; j < curN; j++) {
			const a = currentNodes[j].p
			for (const k of parentToChildrenBaseline[j]) {
				const b = nextNodes[k].p
				segments.push([a, b])
			}
		}
		const snapped = (snapToPolyline && layer?.polylines?.[0])
			? segments.map(([a, b]) => {
				const vec = new THREE.Vector3(b[0], b[1], b[2])
				const hit = nearestPointOnPolyline(layer, vec) || vec
				return [a, [hit.x, hit.y, hit.z]]
			})
			: segments
		const contiguous = enforceStepContinuity(prevSegments, snapped)

		// Build next ring as sorted by azimuth
		const snapChild = (k) => {
			const p = nextNodes[k]?.p || nextNodes[k]
			const vec = new THREE.Vector3(p[0], p[1], p[2])
			if (snapToPolyline && layer?.polylines?.[0]) {
				const hit = nearestPointOnPolyline(layer, vec) || vec
				return [hit.x, hit.y, hit.z]
			}
			return [vec.x, vec.y, vec.z]
		}
		const childList = Array.from({ length: nxtN }, (_, k) => ({ p: snapChild(k) }))
		const childWithAngle = childList.map((node) => ({ node, theta: angleOf(node.p, basis) }))
		childWithAngle.sort((a, b) => a.theta - b.theta)
		const nextCurrentNodes = childWithAngle.map(e => e.node)
		devReportInvariants({ m: curN, n: nxtN, policy: 'equal', parentToChildren: parentToChildrenBaseline, C, start })
		return { segments: contiguous, nextCurrentNodes, parentToChildren: parentToChildrenBaseline, status: 'ok' }
	}

	// Build parent→children mapping for increase/decrease on top of baseline
	let parentToChildren = Array.from({ length: curN }, () => [])
	// start from baseline mapping
	for (let j = 0; j < curN; j++) parentToChildren[j] = parentToChildrenBaseline[j].slice()
	if (curN > nxtN) {
		// DECREASES (m > n): even merges with degree clamp
		const m = curN, n = nxtN
		if (m > 2 * n) {
			return { segments: [], nextCurrentNodes: currentNodes, parentToChildren: [], status: 'need_split_prev' }
		}
		const decs = m - n
		const spacing = Math.max(1, Math.floor(m / Math.max(1, decs)))

		// Start with each child having 1 parent from the baseline anchors:
		const deg = new Array(n).fill(0)
		for (let k = 0; k < Math.min(m, n); k++) deg[(start + k) % n] = 1

		let counter = 0, left = decs
		let childPos = 0 // walk child slots in order

		for (let pi = 0; pi < m; pi++) {
			const pReal = P[pi].i

			// Only parents beyond first n get a second assignment (merge)
			if (pi >= n) {
				// advance to the next child that still has degree < 2
				let guard = 0
				while (deg[childPos] >= 2 && guard < n) { childPos = (childPos + 1) % n; guard++ }
				const rotPos = (start + childPos) % n
				parentToChildren[pReal].push(C[rotPos].i)
				deg[childPos]++ // now 2
			}

			// even spacing of merges
			counter++
			if (left > 0 && counter >= spacing) {
				left--
				counter = 0 // hold position (next parent merges to same child)
			} else {
				childPos = (childPos + 1) % n
			}
		}

		// DEV: no child > 2; exactly 'decs' with degree 2
		if (DEV) {
			console.assert(deg.every(d => d === 1 || d === 2), '[V3] decrease: child degree must be 1 or 2')
			const twos = deg.filter(d => d === 2).length
			console.assert(twos === decs, '[V3] decrease: merges count mismatch')
			// eslint-disable-next-line no-console
			console.log('[V3] dec m,n,decs=', m, n, decs, 'degrees', deg)
		}
	} else {
		// INCREASES (delta > 0): quotas + circular blocks (adjacent children, monotone order)
		const m = curN, n = nxtN
		if (n > 2 * m) {
			return { segments: [], nextCurrentNodes: currentNodes, parentToChildren: [], status: 'need_split' }
		}
		// eslint-disable-next-line no-console
		console.log('[V3] policy=', increasePolicy, 'm=', m, 'n=', n, 'extra=', n - m)

		// quotas in {1,2} with total exactly n
		const quotas = new Array(m).fill(1)
		if (n > m) {
			const extra = n - m
			if (increasePolicy === 'nearest' && extra > 0) {
				// Choose which parents get +1 by nearest orphan → anchored child heuristic
				const CthAll = C.map(x => x.th)
				const usedChild = new Array(n).fill(false)
				for (let k = 0; k < Math.min(m, n); k++) usedChild[(start + k) % n] = true
				const orphanPositions = []
				for (let k = 0; k < n; k++) if (!usedChild[k]) orphanPositions.push(k)
				const chosen = new Set()
				for (const pos of orphanPositions) {
					const th = CthAll[pos]
					let bestJ = 0, best = Infinity
					for (let j = 0; j < m; j++) {
						const anchorPos = (start + j) % n
						const mid = CthAll[anchorPos]
						const d = Math.abs(normAngle(th - mid))
						if (d < best) { best = d; bestJ = j }
					}
					chosen.add(bestJ)
					if (chosen.size === extra) break
				}
				if (chosen.size < extra) {
					for (let j = 0; j < m && chosen.size < extra; j++) if (!chosen.has(j)) chosen.add(j)
				}
				for (const j of chosen) quotas[j] = 2
			} else if (extra > 0) {
				// spread_out: evenly spaced parents (lock rotation later)
				const chosen = pickEvenParents(m, extra, 0)
				for (const j of chosen) quotas[j] = 2
			}
			// Correction pass to ensure sum(quotas) == n
			let sum = quotas.reduce((s, q) => s + q, 0)
			for (let i = 0; sum < n && i < m; i++) if (quotas[i] < 2) { quotas[i]++; sum++ }
			for (let i = m - 1; sum > n && i >= 0; i--) if (quotas[i] > 1) { quotas[i]--; sum-- }
			// eslint-disable-next-line no-console
			console.log('[V3] quotas', quotas, 'sum', quotas.reduce((a, b) => a + b, 0), 'should equal n', n)
		}

		// rotation for block assignment
		let start2
		if (increasePolicy === 'spread_out') {
			// lock rotation to baseline start so even spacing survives
			start2 = start
		} else {
			const Pth = P.map(x => x.th), Cth = C.map(x => x.th)
			start2 = bestStartByBlockCenters(Pth, Cth, quotas)
		}
		// eslint-disable-next-line no-console
		console.log('[V3] rotation', { start, start2, locked: increasePolicy === 'spread_out' })

		// assign children from a single circular sequence
		const Cidx = C.map(x => x.i)
		const childSeq = Array.from({ length: n }, (_, k) => (start2 + k) % n)
		parentToChildren = Array.from({ length: m }, () => [])
		let cursor = 0
		for (let i = 0; i < m; i++) {
			const q = quotas[i]
			for (let t = 0; t < q; t++) {
				const pos = childSeq[cursor + t]
				parentToChildren[P[i].i].push(Cidx[pos])
			}
			cursor += q
		}
		// eslint-disable-next-line no-console
		console.log('[V3] per-parent loads', parentToChildren.map(l => l.length))

		if (DEV) {
			const use = new Array(n).fill(0)
			for (let i = 0; i < m; i++) for (const c of parentToChildren[P[i].i]) {
				const pos = C.findIndex(e => e.i === c)
				use[pos]++
			}
			if (!use.every(c => c === 1)) throw new Error('[V3] increase: every child must be used exactly once')
			for (let i = 0; i < m; i++) {
				const list = parentToChildren[i]
				if (!(list.length === 1 || list.length === 2)) throw new Error('[V3] increase: quota must be 1 or 2')
				if (list.length === 2) {
					const a = C.findIndex(e => e.i === list[0])
					const b = C.findIndex(e => e.i === list[1])
					const adj = (b === (a + 1) % n)
					if (!adj) throw new Error('[V3] increase: parent’s two children must be adjacent')
				}
			}
		}
	}

	// Dev invariants for increases
	if (DEV && curN < nxtN && nxtN <= 2 * curN) {
		const used = new Array(nxtN).fill(0)
		for (let i = 0; i < curN; i++) for (const k of parentToChildren[P[i].i]) {
			const rotPos = C.findIndex(e => e.i === k)
			if (rotPos >= 0) used[(rotPos - start + nxtN) % nxtN]++
		}
		if (!used.every(c => c === 1)) console.assert(false, '[buildStepV3] child usage must be exactly once')
		for (let i = 0; i < curN; i++) {
			const len = parentToChildren[i].length
			console.assert(len === 1 || len === 2, '[buildStepV3] parent quota must be 1 or 2')
			if (len === 2) {
				const aIdx = C.findIndex(e => e.i === parentToChildren[i][0])
				const bIdx = C.findIndex(e => e.i === parentToChildren[i][1])
				const adj = (bIdx === (aIdx + 1) % nxtN)
				console.assert(adj, '[buildStepV3] increase children must be adjacent')
			}
		}
	}

	// Build segments
	const segments = []
	for (let j = 0; j < curN; j++) {
		const a = currentNodes[j].p
		for (const k of parentToChildren[j]) {
			const b = nextNodes[k].p
			segments.push([a, b])
		}
	}

	// Optionally snap to polyline and enforce continuity
	const snapped = (snapToPolyline && layer?.polylines?.[0])
		? segments.map(([a, b]) => {
			const vec = new THREE.Vector3(b[0], b[1], b[2])
			const hit = nearestPointOnPolyline(layer, vec) || vec
			return [a, [hit.x, hit.y, hit.z]]
		})
		: segments
	const contiguous = enforceStepContinuity(prevSegments, snapped)

	// Build the next ring as UNIQUE child nodes
	const snapChild = (k) => {
		const p = nextNodes[k]?.p || nextNodes[k]
		const vec = new THREE.Vector3(p[0], p[1], p[2])
		if (snapToPolyline && layer?.polylines?.[0]) {
			const hit = nearestPointOnPolyline(layer, vec) || vec
			return [hit.x, hit.y, hit.z]
		}
		return [vec.x, vec.y, vec.z]
	}
	const childList = Array.from({ length: nxtN }, (_, k) => ({ p: snapChild(k) }))
	const childWithAngle = childList.map((node) => ({ node, theta: angleOf(node.p, basis) }))
	childWithAngle.sort((a, b) => a.theta - b.theta)
	const nextCurrentNodes = childWithAngle.map(e => e.node)
	devReportInvariants({ m: curN, n: nxtN, policy: increasePolicy, parentToChildren, C, start })

	return { segments: contiguous, nextCurrentNodes, parentToChildren, status: 'ok' }
}
