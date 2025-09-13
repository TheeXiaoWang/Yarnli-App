import * as THREE from 'three'
import { alignNextRingByAzimuthAxis } from './alignNextRingByAzimuthAxis'
import { nearestPointOnPolyline } from '../../ui/editor/measurements/utils'
import { resamplePolylineByArcLength, resamplePolylineByArcLengthCentered, polylineLength3D } from '../../domain/layerlines/circumference'
import { mapBucketsMonotonic } from '../../domain/nodes/transitions/mapBuckets'
import { orientNodeToLayerPath } from '../../domain/nodes/utils/orientNodeToLayerPath'

// Pure step builder: from currentNodes -> next layer (polyline + y, radius)
// returns { segments, nextNodes, parentToChildren }
export function buildScaffoldStep({
  currentNodes,
  layer,
  yNext,
  rNext,
  nextCount,
  center,
  up,
  handedness = 'right',
  distributeNextNodes,
  aRef = null,
  yarnWidth = 0,
}) {
  const metaCenterArr = center
  let { nodes: nextNodes } = distributeNextNodes({ yNext, rNext, nextCount, center: metaCenterArr, up, handedness })
  if (currentNodes && currentNodes.length > 0 && nextNodes && nextNodes.length > 0) {
    const aligned = alignNextRingByAzimuthAxis(currentNodes.map(n => n.p), nextNodes.map(n => n.p), metaCenterArr, up, handedness)
    nextNodes = aligned.map((p) => ({ p }))
  }
  const curN = currentNodes.length
  const nxtN = nextNodes.length

  // Build monotone, clamped parent→children mapping
  const { map } = mapBucketsMonotonic(currentNodes, nextNodes)
  let parentToChildren = map.map((e) => e.children)

  // Hard rule for decreases: one child per parent (no W/N shapes)
  if (nxtN < curN) {
    parentToChildren = parentToChildren.map((list) => (list && list.length > 0 ? [list[0]] : []))
  }

  // If we have layer polylines, handle both closed rings and CUT rings (multiple open arcs).
  // For CUT rings we must NOT wrap across gaps. We resample per-arc (open) and map locally.
  const polylines = Array.isArray(layer?.polylines) ? layer.polylines.filter(p => Array.isArray(p) && p.length > 1) : []

  // Helper: detect if a polyline is explicitly closed (first==last)
  const isClosed = (poly) => (
    Array.isArray(poly) && poly.length > 2 &&
    poly[0][0] === poly[poly.length - 1][0] &&
    poly[0][1] === poly[poly.length - 1][1] &&
    poly[0][2] === poly[poly.length - 1][2]
  )

  // Local helpers for CUT handling
  // Allocate per-arc counts proportionally, but guarantee min 1 for arcs whose length ≥ stitch width
  const allocateCountsMin1 = (totalN, lengths, stitchW) => {
    const sum = Math.max(1e-12, lengths.reduce((a, b) => a + b, 0))
    const raw = lengths.map((L) => (L / sum) * totalN)
    const base = raw.map(Math.floor)
    let left = totalN - base.reduce((a, b) => a + b, 0)

    // Enforce min 1 for non-trivial arcs (length ≥ stitchW)
    for (let i = 0; i < lengths.length; i++) {
      if (lengths[i] >= stitchW && base[i] === 0) {
        base[i] = 1
        left -= 1
      }
    }

    // If we overshot, borrow from arcs with the largest surplus (base - raw)
    if (left < 0) {
      const borrow = raw.map((r, i) => ({ i, surplus: (base[i] - r) }))
        .sort((a, b) => b.surplus - a.surplus)
      let idx = 0
      while (left < 0 && idx < borrow.length) {
        const j = borrow[idx].i
        if (base[j] > 1) { base[j] -= 1; left += 1 } // keep at least 1 if it was enforced/meaningful
        else idx++
      }
    }

    // Distribute any remaining positive leftover by fractional part (largest fractional first)
    if (left > 0) {
      const rem = raw.map((r, i) => ({ i, frac: r - base[i] })).sort((a, b) => b.frac - a.frac)
      for (let k = 0; k < left; k++) base[rem[k % rem.length].i]++
    }

    return base
  }

  // Nearest point (squared distance) to a single open polyline; also return cumulative arc pos
  const nearestOnPolyline = (poly, P) => {
    let bestD2 = Infinity
    let bestS = 0
    let acc = 0
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1]
      const ax = a[0], ay = a[1], az = a[2]
      const bx = b[0], by = b[1], bz = b[2]
      const vx = bx - ax, vy = by - ay, vz = bz - az
      const wx = P.x - ax, wy = P.y - ay, wz = P.z - az
      const vv = Math.max(1e-12, vx * vx + vy * vy + vz * vz)
      let t = (wx * vx + wy * vy + wz * vz) / vv
      t = Math.max(0, Math.min(1, t))
      const px = ax + vx * t, py = ay + vy * t, pz = az + vz * t
      const dx = P.x - px, dy = P.y - py, dz = P.z - pz
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 < bestD2) { bestD2 = d2; bestS = acc + Math.sqrt(vv) * t }
      acc += Math.sqrt(vv)
    }
    return { d2: bestD2, s: bestS }
  }

  // Assign each parent to closest arc id
  const nearestPolylineId = (pt, arcs) => {
    const P = new THREE.Vector3(pt[0], pt[1], pt[2])
    let best = 0, bestD2 = Infinity
    for (let i = 0; i < arcs.length; i++) {
      const { d2 } = nearestOnPolyline(arcs[i], P)
      if (d2 < bestD2) { bestD2 = d2; best = i }
    }
    return best
  }

  // Linear, non-wrapping mapping suitable for open arcs
  const mapBucketsLinear = (m, n) => {
    const result = Array.from({ length: m }, () => [])
    if (m === 0 || n === 0) return result
    if (n >= m) {
      // boundary method (no wrap)
      const maxBranches = 2
      for (let j = 0; j < m; j++) {
        const kStart = Math.round((j * n) / m)
        let kEnd = Math.max(kStart, Math.round(((j + 1) * n) / m) - 1)
        kEnd = Math.min(kStart + (maxBranches - 1), kEnd)
        for (let k = kStart; k <= kEnd && k < n; k++) result[j].push(k)
      }
      return result
    }
    // decreases: quota without wrap
    const merges = m - n
    const quota = new Array(n).fill(1)
    // spread +1 quotas evenly
    const pickEvenSlots = (N, K) => {
      if (K <= 0) return []
      const sel = []
      const step = N / K
      let acc = 0
      for (let i = 0; i < K; i++) { sel.push(Math.floor(acc)); acc += step }
      const used = new Set()
      for (let i = 0; i < sel.length; i++) { let j = sel[i]; while (used.has(j) && j < N - 1) j++; sel[i] = Math.min(j, N - 1); used.add(sel[i]) }
      return sel.sort((a, b) => a - b)
    }
    for (const idx of pickEvenSlots(n, merges)) quota[idx] = 2
    let c = 0
    for (let p = 0; p < m; p++) {
      while (c < n && quota[c] === 0) c++
      if (c >= n) c = n - 1 // clamp
      result[p].push(c)
      quota[c]--
      if (quota[c] === 0 && c < n - 1) c++
    }
    return result
  }

  if (polylines.length > 0) {
    // If we only have a single explicitly closed ring, use the original closed-curve path.
    if (polylines.length === 1 && isClosed(polylines[0])) {
      const poly = polylines[0]
      const evenPtsRaw = resamplePolylineByArcLength(poly, nxtN, true) // closed
      let evenPts = alignNextRingByAzimuthAxis(
        currentNodes.map(n => n.p),
        evenPtsRaw,
        metaCenterArr,
        up,
        handedness
      )
      // Absolute azimuth anchor for stable node0 per object
      if (aRef && Array.isArray(aRef) && aRef.length === 3) {
        const C = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
        const n = new THREE.Vector3(up[0], up[1], up[2]).normalize()
        let seed = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)
        const u = seed.sub(n.clone().multiplyScalar(seed.dot(n))).normalize()
        const v = new THREE.Vector3().crossVectors(n, u)
        const angleOf = (p) => {
          const P = Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z)
          const d = P.clone().sub(C)
          const x = d.dot(u)
          const y = d.dot(v)
          return Math.atan2(y, x)
        }
        const ref = new THREE.Vector3(aRef[0], aRef[1], aRef[2])
        const refPlane = ref.sub(n.clone().multiplyScalar(ref.dot(n)))
        if (refPlane.lengthSq() > 1e-12) {
          const thetaRef = Math.atan2(refPlane.dot(v), refPlane.dot(u))
          let best = 0, bestD = Infinity
          for (let i = 0; i < evenPts.length; i++) {
            const th = angleOf(evenPts[i])
            let d = Math.abs(th - thetaRef)
            if (d > Math.PI) d = 2 * Math.PI - d
            if (d < bestD) { bestD = d; best = i }
          }
          if (best !== 0) evenPts = evenPts.slice(best).concat(evenPts.slice(0, best))
        }
      }
      const mappingOnEven = mapBucketsMonotonic(currentNodes, evenPts.map((p) => ({ p })))
      parentToChildren = mappingOnEven.map.map((e) => e.children)
      const segs = []
      for (let j = 0; j < curN; j++) {
        const from = currentNodes[j].p
        const kids = parentToChildren[j] || []
        for (const k of kids) segs.push([from, evenPts[k] || evenPts[0]])
      }
      const nEven = Math.max(1, evenPts.length)
      const centerV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
      // Detect primary axis once per layer (default to provided up)
      const axis = new THREE.Vector3(up[0], up[1], up[2]).normalize()
      const refAxis = Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
      const east = new THREE.Vector3().crossVectors(axis, refAxis).normalize()
      const north = new THREE.Vector3().crossVectors(east, axis).normalize()
      const nextCurrentNodes = evenPts.map((p, i) => {
        const prev = evenPts[(i - 1 + nEven) % nEven]
        const next = evenPts[(i + 1) % nEven]
        const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
        const pn = new THREE.Vector3(p[0], p[1], p[2])
        const nrm = pn.clone().sub(centerV).normalize()
        // Compute theta for rotisserie in the equatorial plane
        const proj = pn.clone().sub(axis.clone().multiplyScalar(pn.dot(axis)))
        let theta = 0
        if (proj.lengthSq() > 1e-12) {
          proj.normalize()
          theta = Math.atan2(proj.dot(east), proj.dot(north))
        }
        try { if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.log('node', i, 'theta=', theta) } catch(_) {}
        return { id: (i + 1) % nEven, p, tangent: [t.x, t.y, t.z], normal: [nrm.x, nrm.y, nrm.z], theta, quaternion: null }
      })
      nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      return { segments: segs, nextCurrentNodes, parentToChildren }
    }

    // CUT rings: treat each arc independently without wrapping
    const arcs = polylines
    const lengths = arcs.map((poly) => polylineLength3D(poly, false))
    // Use real yarnWidth (same value used in countNextStitches) for min-1 enforcement
    const stitchW = Math.max(1e-9, Number(yarnWidth) || 0)
    const counts = allocateCountsMin1(nxtN, lengths, stitchW)

    // Group parents by nearest arc and compute order along each arc
    const parentsByArc = arcs.map(() => [])
    for (let j = 0; j < curN; j++) {
      const idx = nearestPolylineId(currentNodes[j].p, arcs)
      parentsByArc[idx].push({ idx: j })
    }

    // For ordering: compute s-parameter along the arc for each parent
    for (let i = 0; i < arcs.length; i++) {
      const poly = arcs[i]
      for (const entry of parentsByArc[i]) {
        const P = new THREE.Vector3(currentNodes[entry.idx].p[0], currentNodes[entry.idx].p[1], currentNodes[entry.idx].p[2])
        const { s } = nearestOnPolyline(poly, P)
        entry.s = s
      }
      parentsByArc[i].sort((a, b) => (a.s || 0) - (b.s || 0))
    }

    // Serpentine (back-and-forth) traversal across arcs
    const segs = []
    const parentToChildrenGlobal = Array.from({ length: curN }, () => [])

    // Build serpentine-ordered children (evenPts) and parentsOrdered
    const evenPts = []
    const parentsOrdered = []
    let flip = false
    for (let i = 0; i < arcs.length; i++) {
      const poly = arcs[i]
      const nTargets = Math.max(0, counts[i] | 0)
      if (nTargets === 0) {
        // Skip flipping if this arc contributes no stitches
        continue
      }
      // Center nodes within each open arc: same step (L/N) but half-step inset at ends
      let targets = resamplePolylineByArcLengthCentered(poly, nTargets)
      let arcParents = parentsByArc[i].slice() // already sorted by s increasing
      if (flip) {
        targets = targets.slice().reverse()
        arcParents = arcParents.slice().reverse()
      }
      evenPts.push(...targets.map(p => ({ p, arc: i })))
      parentsOrdered.push(...arcParents)
      flip = !flip
    }

    // Build parent→arc map for quick lookup
    const parentArcOf = new Array(curN).fill(-1)
    for (let i = 0; i < parentsByArc.length; i++) {
      for (const entry of parentsByArc[i]) parentArcOf[entry.idx] = i
    }

    // Tag parents with arc id (cut layers only) for arc-aware mapping downstream
    for (let j = 0; j < curN; j++) {
      currentNodes[j] = { ...currentNodes[j], arc: parentArcOf[j] }
    }

    // Gap-aware mapping: for cut layers, pair each parent to the nearest child
    // within the same arc only (no cross-gap jumps, no wrap-around).
    for (let j = 0; j < curN; j++) {
      const from = currentNodes[j].p
      let arcId = parentArcOf[j]
      if (arcId < 0) arcId = nearestPolylineId(from, arcs)
      // candidates from same arc
      const candidates = []
      for (let k = 0; k < evenPts.length; k++) if (evenPts[k].arc === arcId) candidates.push(k)
      if (candidates.length === 0) continue
      let bestK = candidates[0]
      let bestD2 = Infinity
      for (const k of candidates) {
        const q = evenPts[k].p
        const dx = from[0] - q[0], dy = from[1] - q[1], dz = from[2] - q[2]
        const d2 = dx*dx + dy*dy + dz*dz
        if (d2 < bestD2) { bestD2 = d2; bestK = k }
      }
      segs.push([from, evenPts[bestK].p])
      parentToChildrenGlobal[j].push(bestK)
    }

    const nEven = Math.max(1, evenPts.length)
    const centerV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
    const axis = new THREE.Vector3(up[0], up[1], up[2]).normalize()
    const refAxis = Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
    const east = new THREE.Vector3().crossVectors(axis, refAxis).normalize()
    const north = new THREE.Vector3().crossVectors(east, axis).normalize()
    const nextCurrentNodes = evenPts.map((e, i) => {
      // use forward/backward neighbors without wrapping across serpentine ends
      const prevIdx = i > 0 ? i - 1 : 0
      const nextIdx = i < nEven - 1 ? i + 1 : nEven - 1
      const prev = evenPts[prevIdx].p
      const next = evenPts[nextIdx].p
      const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
      const pn = new THREE.Vector3(e.p[0], e.p[1], e.p[2])
      const nrm = pn.clone().sub(centerV).normalize()
      const proj = pn.clone().sub(axis.clone().multiplyScalar(pn.dot(axis)))
      let theta = 0
      if (proj.lengthSq() > 1e-12) {
        proj.normalize()
        theta = Math.atan2(proj.dot(east), proj.dot(north))
      }
      try { if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.log('node', i, 'theta=', theta) } catch(_) {}
      return { id: (i + 1) % nEven, p: e.p, tangent: [t.x, t.y, t.z], normal: [nrm.x, nrm.y, nrm.z], theta, quaternion: null, arc: e.arc }
    })
    nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    return { segments: segs, nextCurrentNodes, parentToChildren: parentToChildrenGlobal }
  }

  // Fallback legacy path when no polylines are available
  // If we have a layer polyline, prefer evenly spaced targets around it (axis-agnostic),
  // aligned by azimuth to the current ring to avoid crossings on sideways rings.
  const poly = layer?.polylines?.[0]
  if (Array.isArray(poly) && poly.length > 1) {
    const evenPtsRaw = resamplePolylineByArcLength(poly, nxtN, true)
    let evenPts = alignNextRingByAzimuthAxis(
      currentNodes.map(n => n.p),
      evenPtsRaw,
      metaCenterArr,
      up,
      handedness
    )
    // Absolute azimuth anchor for stable node0 per object
    if (aRef && Array.isArray(aRef) && aRef.length === 3) {
      const C = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
      const n = new THREE.Vector3(up[0], up[1], up[2]).normalize()
      let seed = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)
      const u = seed.sub(n.clone().multiplyScalar(seed.dot(n))).normalize()
      const v = new THREE.Vector3().crossVectors(n, u)
      const angleOf = (p) => {
        const P = Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z)
        const d = P.clone().sub(C)
        const x = d.dot(u)
        const y = d.dot(v)
        return Math.atan2(y, x)
      }
      const ref = new THREE.Vector3(aRef[0], aRef[1], aRef[2])
      const refPlane = ref.sub(n.clone().multiplyScalar(ref.dot(n)))
      if (refPlane.lengthSq() > 1e-12) {
        const thetaRef = Math.atan2(refPlane.dot(v), refPlane.dot(u))
        let best = 0, bestD = Infinity
        for (let i = 0; i < evenPts.length; i++) {
          const th = angleOf(evenPts[i])
          let d = Math.abs(th - thetaRef)
          if (d > Math.PI) d = 2 * Math.PI - d
          if (d < bestD) { bestD = d; best = i }
        }
        if (best !== 0) evenPts = evenPts.slice(best).concat(evenPts.slice(0, best))
      }
    }
    const mappingOnEven = mapBucketsMonotonic(currentNodes, evenPts.map((p) => ({ p })))
    parentToChildren = mappingOnEven.map.map((e) => e.children)
    const segs = []
    for (let j = 0; j < curN; j++) {
      const from = currentNodes[j].p
      const kids = parentToChildren[j] || []
      for (const k of kids) {
        const to = nextNodes[k].p
        segments.push([from, to])
      }
    }

  // Snap endpoints to actual layer polyline so scaffolding follows stretched shapes
  const snapped = (layer?.polylines?.[0])
    ? segments.map(([a, b]) => {
        const vec = new THREE.Vector3(b[0], b[1], b[2])
        const hit = nearestPointOnPolyline(layer, vec) || vec
        return [a, [hit.x, hit.y, hit.z]]
      })
    : segments

  // Build the next ring as UNIQUE child nodes (count == nxtN), snapped and ordered by nextNodes index
  const snapChild = (k) => {
    const p = nextNodes[k]?.p || nextNodes[k]
    const vec = new THREE.Vector3(p[0], p[1], p[2])
    if (layer?.polylines?.[0]) {
      const hit = nearestPointOnPolyline(layer, vec) || vec
      return [hit.x, hit.y, hit.z]
    }
    return [vec.x, vec.y, vec.z]
  }
  const nextCurrentNodes = Array.from({ length: nxtN }, (_, k) => ({ id: (k + 1) % Math.max(1, nxtN), p: snapChild(k) }))
  nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

  return { segments: snapped, nextCurrentNodes, parentToChildren }
}}