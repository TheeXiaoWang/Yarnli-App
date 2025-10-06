import * as THREE from 'three'
import { alignNextRingByAzimuthAxis } from './alignNextRingByAzimuthAxis'
import { nearestPointOnPolyline } from '../../ui/editor/measurements/utils'
import { resamplePolylineByArcLength, resamplePolylineByArcLengthCentered, polylineLength3D } from '../../domain/layerlines/circumference'
import { mapBucketsMonotonic } from '../../domain/nodes/transitions/mapBuckets'
import { mapBucketsLinear, allocateCountsMin1 } from '../nodes/mapping'
import { isClosed, nearestOnPolyline, nearestPolylineId } from './helpers/polylineUtils'
import { buildNodes } from '../nodes/buildNodes'

// Pure step builder: from currentNodes -> next layer (polyline + y, radius)
// returns { segments, nextNodes, parentToChildren }
export function buildScaffoldStep({
  currentNodes,
  layer,
  yNext,
  rNext,
  nextCount,
  center,
  sphereCenter,
  maxCircumference,
  up,
  handedness = 'right',
  distributeNextNodes,
  aRef = null,
  yarnWidth = 0,
  stitchType = 'sc',
  tiltScale = 1.0,
  rollAngle = null, // Pre-calculated tilt angle from sphere tilt pipeline
}) {
  // Dynamic tilt scale for fallback circumference-based formula only
  // NOTE: This is NOT used for the corrected sphere-based formula
  const dynamicTiltScaleForLayer = (layer) => {
    try {
      const r = Number(layer?.meta?.axisRatio)
      if (!Number.isFinite(r) || r < 1) return 1.0
      // Linear mapping: r=1 -> 1.8, r=1.5 -> 1.5, r=2 -> 1.2; clamp to [0.6, 1.8]
      const s = 2.4 - 0.6 * r
      return Math.max(0.6, Math.min(1.8, s))
    } catch (_) { return 1.0 }
  }
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
      const ringCenterV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
      const sphereCenterV = new THREE.Vector3(sphereCenter[0], sphereCenter[1], sphereCenter[2])
      const upV = new THREE.Vector3(up[0], up[1], up[2]).normalize()
      const hemiSign = Math.sign(ringCenterV.clone().sub(sphereCenterV).dot(upV)) || 1
      const thisCirc = 2 * Math.PI * Math.max(1e-9, rNext)
      // Cone-specific tilt: constant on side (coneTilt from meta), 90° on base rings
      if (layer?.meta?.shape === 'cone') {
        const coneTilt = Number(layer?.meta?.coneTilt)
        const rollFromCirc = Number.isFinite(coneTilt) ? coneTilt : (Math.PI / 4)
        const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollFromCirc, hemiSign, stitchType, layer?.meta)
        nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        return { segments: segs, nextCurrentNodes, parentToChildren }
      }
      // Use pre-calculated tilt angle from sphere tilt pipeline
      const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollAngle, hemiSign, stitchType, layer?.meta)
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

    const ringCenterV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
    const sphereCenterV = new THREE.Vector3(sphereCenter[0], sphereCenter[1], sphereCenter[2])
    const upV = new THREE.Vector3(up[0], up[1], up[2]).normalize()
    const hemiSign = Math.sign(ringCenterV.clone().sub(sphereCenterV).dot(upV)) || 1
    const thisCirc = 2 * Math.PI * Math.max(1e-9, rNext)
    if (layer?.meta?.shape === 'cone') {
      const coneTilt = Number(layer?.meta?.coneTilt)
      const rollFromCirc = Number.isFinite(coneTilt) ? coneTilt : (Math.PI / 4)
      const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollFromCirc, hemiSign, stitchType, layer?.meta)
      nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      return { segments: segs, nextCurrentNodes, parentToChildren: parentToChildrenGlobal }
    }
    // Use pre-calculated tilt angle from sphere tilt pipeline
    const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollAngle, hemiSign, stitchType, layer?.meta)
    nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    return { segments: segs, nextCurrentNodes, parentToChildren: parentToChildrenGlobal }
  }

  // Fallback legacy path when no polylines are available
  // If we have a layer polyline, prefer evenly spaced targets around it (axis-agnostic),
  // aligned by azimuth to the current ring to avoid crossings on sideways rings.
  const poly = layer?.polylines?.[0]
  if (Array.isArray(poly) && poly.length > 1) {
    const evenPtsRaw = resamplePolylineByArcLength(poly, nxtN, true)
    let evenPtsLegacy = alignNextRingByAzimuthAxis(
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
        for (let i = 0; i < evenPtsLegacy.length; i++) {
          const th = angleOf(evenPtsLegacy[i])
          let d = Math.abs(th - thetaRef)
          if (d > Math.PI) d = 2 * Math.PI - d
          if (d < bestD) { bestD = d; best = i }
        }
        if (best !== 0) evenPtsLegacy = evenPtsLegacy.slice(best).concat(evenPtsLegacy.slice(0, best))
      }
    }
    const mappingOnEven = mapBucketsMonotonic(currentNodes, evenPtsLegacy.map((p) => ({ p })))
    parentToChildren = mappingOnEven.map.map((e) => e.children)
    const segs = []
    for (let j = 0; j < curN; j++) {
      const from = currentNodes[j].p
      const kids = parentToChildren[j] || []
      for (const k of kids) {
        const to = nextNodes[k].p
        segs.push([from, to])
      }
    }

    // Snap endpoints to actual layer polyline so scaffolding follows stretched shapes
    const snapped = (layer?.polylines?.[0])
      ? segs.map(([a, b]) => {
          const vec = new THREE.Vector3(b[0], b[1], b[2])
          const hit = nearestPointOnPolyline(layer, vec) || vec
          return [a, [hit.x, hit.y, hit.z]]
        })
      : segs

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
    const evenPtsSnapped = Array.from({ length: nxtN }, (_, k) => ({ p: snapChild(k) }))
    const centerV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
    const upV = new THREE.Vector3(up[0], up[1], up[2])
    const nextCurrentNodes = buildNodes(evenPtsSnapped, centerV, upV, yNext, rNext)
    nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

    return { segments: snapped, nextCurrentNodes, parentToChildren }
  }

  // Final fallback: no polylines at all
  const segs = []
  for (let j = 0; j < curN; j++) {
    const from = currentNodes[j].p
    const kids = parentToChildren[j] || []
    for (const k of kids) {
      const to = nextNodes[k].p
      segs.push([from, to])
    }
  }

  const evenPts = nextNodes.map(n => ({ p: n.p }))
  const ringCenterV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
  const sphereCenterV = new THREE.Vector3(sphereCenter[0], sphereCenter[1], sphereCenter[2])
  const upV = new THREE.Vector3(up[0], up[1], up[2]).normalize()
  const hemiSign = Math.sign(ringCenterV.clone().sub(sphereCenterV).dot(upV)) || 1
  const thisCirc = 2 * Math.PI * Math.max(1e-9, rNext)
  if (layer?.meta?.shape === 'cone') {
    const coneTilt = Number(layer?.meta?.coneTilt)
    const rollFromCirc = Number.isFinite(coneTilt) ? coneTilt : (Math.PI / 4)
    const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollFromCirc, hemiSign, stitchType, layer?.meta)
    nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    return { segments: segs, nextCurrentNodes, parentToChildren }
  }
  // Use pre-calculated tilt angle from sphere tilt pipeline
  const nextCurrentNodes = buildNodes(evenPts, [ringCenterV.x, ringCenterV.y, ringCenterV.z], [sphereCenterV.x, sphereCenterV.y, sphereCenterV.z], upV, rNext, rollAngle, hemiSign, stitchType, layer?.meta)
  nextCurrentNodes.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

  return { segments: segs, nextCurrentNodes, parentToChildren }
}


