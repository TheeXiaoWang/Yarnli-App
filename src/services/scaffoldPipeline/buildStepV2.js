import * as THREE from 'three'
import { nearestPointOnPolyline } from '../../components/measurements/utils'
import { enforceStepContinuity } from '../../utils/nodes/scaffold'
import { mapConsecutiveBuckets } from './mapConsecutive'

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

function cost(parent, child, basis, scale) {
  const angP = angleOf(parent, basis)
  const angC = angleOf(child, basis)
  const dang = Math.abs(normAngle(angP - angC)) / Math.PI // [0,1]
  const dx = parent[0]-child[0], dy = parent[1]-child[1], dz = parent[2]-child[2]
  const d = Math.sqrt(dx*dx + dy*dy + dz*dz) / Math.max(scale, 1e-6)
  return 0.7 * dang + 0.3 * Math.min(1, d)
}

export function buildStepV2({
  currentNodes,
  layer,
  yNext,
  rNext,
  nextCount,
  center,
  up,
  distributeNextNodes,
  prevSegments = null,
}) {
  const basis = makeBasis(center, up)
  let { nodes: nextNodes } = distributeNextNodes({ yNext, rNext, nextCount, center, up })

  const curN = currentNodes.length
  const nxtN = nextNodes.length
  if (curN === 0 || nxtN === 0) return { segments: [], nextCurrentNodes: [], parentToChildren: [] }

  // scale for distance term (radius proxy)
  const sample = nextNodes[0]?.p || currentNodes[0]?.p
  const scale = sample ? Math.hypot(sample[0]-center[0], sample[2]-center[2]) : 1

  const segments = []
  // Proximity-first, monotone matching
  const parentAngles = currentNodes.map(n => angleOf(n.p, basis))
  const childOrder = Array.from({ length: nxtN }, (_, k) => k).sort((a, b) => angleOf(nextNodes[a].p, basis) - angleOf(nextNodes[b].p, basis))
  const sortedChildAngles = childOrder.map(k => angleOf(nextNodes[k].p, basis))

  // rotate children so index 0 is nearest to parent 0
  let start = 0
  {
    let best = 0, bestD = Infinity
    for (let i = 0; i < nxtN; i++) {
      const d = Math.abs(normAngle(parentAngles[0] - sortedChildAngles[i]))
      if (d < bestD) { bestD = d; best = i }
    }
    start = best
  }
  const rotChildIdx = (i) => childOrder[(start + i) % nxtN]
  const rotChildAng = (i) => sortedChildAngles[(start + i) % nxtN]

  // Step 1 block removed (was one-to-one greedy assignment)

  // Step 2a (decreases): clamp so no child has 3 parents while some child has 1
  // Removed: no longer needed with spacing-based decreases (never >2 parents per child)

  // Step 2: build parent→children mapping
  let parentToChildren
  if (curN > nxtN) {
    // DECREASES – even spacing: after every 'spacing' parents, merge the next pair
    const decs = curN - nxtN
    const spacing = Math.max(1, Math.floor(curN / decs))
    parentToChildren = Array.from({ length: curN }, () => [])
    let k = 0
    let counter = 0
    let pairPending = false
    let remaining = decs
    for (let j = 0; j < curN; j++) {
      parentToChildren[j].push(rotChildIdx(k))
      if (pairPending) {
        // second parent for the same child index, then advance
        k = (k + 1) % nxtN
        pairPending = false
        counter = 0
        continue
      }
      counter++
      if (remaining > 0 && counter >= spacing) {
        // hold k so next parent shares same child (merge)
        pairPending = true
        remaining--
        counter = 0
      } else {
        k = (k + 1) % nxtN
      }
    }
  } else {
    // Use the unified matcher for increases
    const res = matchRings(currentNodes, nextNodes, basis)
    if (res.status === 'need_split') {
      return { segments: [], nextCurrentNodes: currentNodes, parentToChildren: [], status: 'need_split' }
    } else {
      parentToChildren = res.parentToChildren
    }
  }

  // Build segments
  for (let j = 0; j < curN; j++) {
    const a = currentNodes[j].p
    for (const k of parentToChildren[j]) {
      const b = nextNodes[k].p
      segments.push([a, b])
    }
  }

  // Snap segment endpoints to polyline and enforce continuity for visualization
  const snapped = (layer?.polylines?.[0])
    ? segments.map(([a, b]) => {
        const vec = new THREE.Vector3(b[0], b[1], b[2])
        const hit = nearestPointOnPolyline(layer, vec) || vec
        return [a, [hit.x, hit.y, hit.z]]
      })
    : segments
  const contiguous = enforceStepContinuity(prevSegments, snapped)

  // Build the next ring as UNIQUE child nodes (count == nxtN), sorted by azimuth
  const snapChild = (k) => {
    const p = nextNodes[k]?.p || nextNodes[k]
    const vec = new THREE.Vector3(p[0], p[1], p[2])
    if (layer?.polylines?.[0]) {
      const hit = nearestPointOnPolyline(layer, vec) || vec
      return [hit.x, hit.y, hit.z]
    }
    return [vec.x, vec.y, vec.z]
  }
  const childList = Array.from({ length: nxtN }, (_, k) => ({ p: snapChild(k) }))
  const childWithAngle = childList.map((node) => ({ node, theta: angleOf(node.p, basis) }))
  childWithAngle.sort((a, b) => a.theta - b.theta)
  const nextCurrentNodes = childWithAngle.map(e => e.node)

  return { segments: contiguous, nextCurrentNodes, parentToChildren }
}

function sortByTheta(nodes, basis) {
  return nodes
    .map((n, i) => ({ i, p: n.p, th: angleOf(n.p, basis) }))
    .sort((a, b) => a.th - b.th)
}

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

function matchRings(currentNodes, nextNodes, basis) {
  const P = sortByTheta(currentNodes, basis)
  const C = sortByTheta(nextNodes, basis)
  const m = P.length, n = C.length

  if (!m || !n) return { parentToChildren: [], status: 'empty' }

  // Quotas per parent
  let quotas = new Array(m).fill(1)
  if (n > m) {
    if (n > 2 * m) {
      return { parentToChildren: [], status: 'need_split', reason: 'nxtN > 2*curN' }
    }
    const base = Math.floor(n / m)
    const extra = n - base * m
    let err = 0
    for (let i = 0; i < m; i++) {
      const give = (err + extra >= m) ? 1 : 0
      quotas[i] = base + give
      err = (err + extra) % m
    }
  }

  const Pth = P.map(x => x.th)
  const Cth = C.map(x => x.th)
  const Cidx = C.map(x => x.i)
  const start = bestStartByBlockCenters(Pth, Cth, quotas)

  const parentToChildren = Array.from({ length: m }, () => [])
  if (n >= m) {
    // increases 1->2
    let pos = 0
    const assignedOrder = []
    for (let i = 0; i < m; i++) {
      const k = quotas[i]
      for (let t = 0; t < k; t++) {
        const rotPos = (start + pos + t) % n
        parentToChildren[P[i].i].push(Cidx[rotPos])
        assignedOrder.push(rotPos)
      }
      pos += k
    }

    // Invariants (dev): every child used exactly once; per-parent size ∈ {1,2}; if 2 → adjacent; monotone modulo n
    if (DEV) {
      const use = new Array(n).fill(0)
      for (const pos of assignedOrder) use[pos]++
      if (!use.every(c => c === 1)) throw new Error('[ScaffoldPlanner V2] Child usage must be exactly once in increases')
      for (let i = 0, base = 0; i < m; i++) {
        const len = quotas[i]
        if (!(len === 1 || len === 2)) throw new Error('[ScaffoldPlanner V2] Parent quota must be 1 or 2')
        if (len === 2) {
          const a = assignedOrder[base]
          const b = assignedOrder[base + 1]
          const adj = (b === (a + 1) % n)
          if (!adj) throw new Error('[ScaffoldPlanner V2] Increase children must be adjacent')
        }
        base += len
      }
      let last = -1, wrapped = false, ok = true
      for (const pos of assignedOrder) {
        if (!wrapped && pos < last) wrapped = true
        else if (wrapped && pos < last) { ok = false; break }
        last = pos
      }
      if (!ok) throw new Error('[ScaffoldPlanner V2] Non-monotonic child assignment')
    }
  } else {
    // decreases 2->1 evenly spaced merges
    const decs = m - n
    const spacing = Math.max(1, Math.floor(m / decs))
    let k = 0, counter = 0, pair = false, left = decs
    for (let i = 0; i < m; i++) {
      parentToChildren[P[i].i].push(Cidx[(start + k) % n])
      if (pair) { k = (k + 1) % n; pair = false; counter = 0 }
      counter++
      if (left > 0 && counter >= spacing) { pair = true; left--; counter = 0 }
      else { k = (k + 1) % n }
    }
  }

  return { parentToChildren, status: 'ok' }
}


