import * as THREE from 'three'
import { vec, segVector, segProjected } from '../utils'
import { nearestPointOnPolyline, intersectWithPlane, makeAzimuthFrame, anchorPointAtAzimuth } from '../geometry/anchors'

// Minimal, restart-from-scratch pipe
// Assumptions:
// - `arr` is an ordered list of layers from start→end (use labelLayersFromPoles upstream)
// - `poles` contains [startPole, endPole]
// - `axis` is the normalized vector from start to end poles
// - Distances are true 3D lengths (vector), not projected
export function buildBaselineSegments(arr, poles, axis, measureEvery = 1, opts = {}) {
  const segments = []
  if (!arr || arr.length === 0 || !poles || poles.length === 0) return segments

  const startPole = vec(poles[0])
  const endPole = poles[1] ? vec(poles[1]) : null

  // Azimuth frame: fixed plane rotated around the stack axis by opts.azimuthDeg
  const { useFixed, planeNormal, azimuthDir } = makeAzimuthFrame(axis || new THREE.Vector3(0,1,0), opts?.azimuthDeg)
  const anchorOnFixedAzimuth = (layer, prev, planePoint) => useFixed
    ? (opts?.strictAzimuth ? (anchorPointAtAzimuth(layer, ax, azimuthDir) || nearestPointOnPolyline(layer, prev || planePoint))
                           : (intersectWithPlane(layer, planePoint, planeNormal, azimuthDir, prev || planePoint) || nearestPointOnPolyline(layer, prev || planePoint)))
    : nearestPointOnPolyline(layer, prev || planePoint)
  const anchorNearestOnly = (layer, prev) => nearestPointOnPolyline(layer, prev) || nearestVertex(layer, prev)

  // Basis along stack axis and a centroid helper used by ordering and vetting
  const ax = (axis && axis.clone ? axis.clone().normalize() : new THREE.Vector3(0,1,0))
  const centroid = (layer) => {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length === 0) return null
    const c = new THREE.Vector3()
    for (let i = 0; i < poly.length; i++) c.add(new THREE.Vector3(...poly[i]))
    return c.multiplyScalar(1 / poly.length)
  }
  const nearestVertex = (layer, ref) => {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length === 0 || !ref) return null
    const r = ref.clone ? ref.clone() : new THREE.Vector3(ref.x, ref.y, ref.z)
    let best = null
    let bestD2 = Infinity
    for (let i = 0; i < poly.length; i++) {
      const p = new THREE.Vector3(...poly[i])
      const d2 = p.distanceToSquared(r)
      if (d2 < bestD2) { bestD2 = d2; best = p }
    }
    return best
  }

  // Utility: find the ring and point that is physically nearest to the start pole
  const findNearestToStart = () => {
    let bestIdx = -1
    let best = null
    let bestD2 = Infinity
    for (let i = 0; i < arr.length; i++) {
      const n = nearestPointOnPolyline(arr[i], startPole) || nearestVertex(arr[i], startPole)
      if (!n) continue
      const d2 = n.distanceToSquared(startPole)
      if (d2 < bestD2) { bestD2 = d2; bestIdx = i; best = n }
    }
    return { idx: bestIdx, point: best }
  }

  // Choose ordering strategy
  let ordered = null
  if (opts?.orderedAlready) {
    // Respect the order provided by the caller (expected sIndex ascending)
    ordered = Array.isArray(arr) ? arr.slice() : []
  } else {
    // Build strict geometric order for cylinders and similar axial shapes:
    // 1) All rings on the start plane (min t), ordered inner→outer
    // 2) Side wall rings in ascending t
    // 3) All rings on the end plane (max t), ordered outer→inner
    const perimeterOf = (layer) => {
      const poly = layer?.polylines?.[0]
      if (!poly || poly.length < 2) return Number.EPSILON
      let sum = 0
      for (let i = 0; i < poly.length - 1; i++) {
        const a = new THREE.Vector3(...poly[i])
        const b = new THREE.Vector3(...poly[i + 1])
        sum += a.distanceTo(b)
      }
      const a0 = new THREE.Vector3(...poly[0])
      const an = new THREE.Vector3(...poly[poly.length - 1])
      sum += a0.distanceTo(an)
      return sum
    }
    const meta = arr.map((layer, idx) => {
      const c = centroid(layer) || startPole
      const t = ax.dot(c.clone().sub(startPole))
      const per = perimeterOf(layer)
      const nearSeg = nearestPointOnPolyline(layer, startPole)
      const nearVert = nearestVertex(layer, startPole)
      const near = nearSeg || nearVert || c
      const dn = near.distanceTo(startPole)
      return { layer, c, t, per, dn, idx }
    })
    if (meta.length === 0) return []
    const epsT = 1e-6
    let minT = Infinity, maxT = -Infinity
    for (const m of meta) { if (m.t < minT) minT = m.t; if (m.t > maxT) maxT = m.t }
    const onStart = meta.filter(m => Math.abs(m.t - minT) <= epsT)
      .sort((a,b) => a.per - b.per || a.idx - b.idx)
    const middle = meta.filter(m => m.t > minT + epsT && m.t < maxT - epsT)
      .sort((a,b) => a.t - b.t || a.idx - b.idx)
    const onEnd = meta.filter(m => Math.abs(m.t - maxT) <= epsT)
      .sort((a,b) => b.per - a.per || a.idx - b.idx)
    ordered = onStart.concat(middle, onEnd).map(m => m.layer)
  }
  const anchors = new Array(ordered.length).fill(null)
  const useNearestChain = !!opts?.forceNearestChain
  // For the very first ring:
  // - If a fixed azimuth frame is requested, lock exact azimuth across all layers
  // - Otherwise, use the nearest point to the start pole for robust inclusion
  anchors[0] = useFixed
    ? (anchorOnFixedAzimuth(ordered[0], startPole, startPole) || anchorNearestOnly(ordered[0], startPole))
    : (anchorNearestOnly(ordered[0], startPole) || anchorOnFixedAzimuth(ordered[0], startPole, startPole))
  for (let i = 1; i < ordered.length; i++) {
    const prev = anchors[i - 1] || startPole
    anchors[i] = useNearestChain
      ? anchorNearestOnly(ordered[i], prev)
      : (anchorOnFixedAzimuth(ordered[i], prev, startPole) || nearestPointOnPolyline(ordered[i], prev))
  }

  // Prepare anchors for validation and end-pole alignment
  const epsilon = Number.isFinite(opts?.snapPoleEpsilon) ? opts.snapPoleEpsilon : 0.05
  const lastIdx = ordered.length - 1
  const anchors2 = anchors.slice()
  const axialGap = (refPoint, layer) => {
    const c = centroid(layer)
    if (!c) return Infinity
    const rp = refPoint.clone ? refPoint.clone() : new THREE.Vector3(refPoint.x, refPoint.y, refPoint.z)
    return Math.abs(ax.dot(c.clone().sub(rp)))
  }
  // Sanity: enforce local shortest-connection if the fixed-plane anchor is illogical
  const maxRel = Number.isFinite(opts?.maxRelativeFactor) ? opts.maxRelativeFactor : 3.0
  const maxAxial = Number.isFinite(opts?.maxAxialFactor) ? opts.maxAxialFactor : 3.0
  // Validate P→0
  if (!opts?.ignorePoles && anchors2[0] && !opts?.strictAzimuth) {
    const nearest0 = nearestPointOnPolyline(ordered[0], startPole)
    if (nearest0) {
      const dPref = startPole.distanceTo(anchors2[0])
      const dNear = startPole.distanceTo(nearest0)
      const gap = axialGap(startPole, ordered[0])
      if (dPref > maxRel * dNear || (Number.isFinite(gap) && gap > 0 && dPref > maxAxial * gap)) anchors2[0] = nearest0
    }
  }
  // Validate ring→ring chain (skip if strict azimuth locking is requested)
  if (!opts?.strictAzimuth) {
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = anchors2[i] || startPole
      const b = anchors2[i + 1]
      const nearestB = nearestPointOnPolyline(ordered[i + 1], a) || nearestVertex(ordered[i + 1], a)
      if (nearestB) {
        const dPref = b ? a.distanceTo(b) : Infinity
        const dNear = a.distanceTo(nearestB)
        const gap = axialGap(centroid(ordered[i]) || a, ordered[i + 1])
        if (!b || dPref > maxRel * dNear || (Number.isFinite(gap) && gap > 0 && dPref > maxAxial * gap)) {
          anchors2[i + 1] = nearestB
        }
      }
    }
  }
  // Do NOT re-aim the last ring when strict azimuth is requested. Respect fixed azimuth frame.
  if (endPole && !opts?.strictAzimuth) {
    const endCandidate = nearestPointOnPolyline(ordered[lastIdx], endPole)
      || anchorOnPlane(ordered[lastIdx], endPole, endPole)
      || nearestVertex(ordered[lastIdx], endPole)
    if (endCandidate) anchors2[lastIdx] = endCandidate
    if (anchors2[lastIdx] && anchors2[lastIdx].distanceTo(endPole) < epsilon) {
      anchors2[lastIdx] = endPole.clone()
    }
  }

  // Human-readable index using shared overlay order when available, else sIndex, else local
  const idxOf = (i) => {
    const layer = ordered[i]
    const map = opts?.idxMap
    if (map && typeof map.get === 'function') {
      const v = map.get(layer)
      if (Number.isFinite(v)) return v
    }
    const s = layer?.sIndex
    return Number.isFinite(s) ? s : i
  }

  const emit = (objectId, label, a, b) => {
    return (opts?.projectAlongAxis && axis)
      ? segProjected(objectId, label, a, b, ax)
      : segVector(objectId, label, a, b)
  }

  // Optional: always show a probe from the start pole to the nearest ring point to prove inclusion
  if (opts?.addProbeSegment !== false) {
    const probe = findNearestToStart()
    if (probe.point && ordered[0]) {
      segments.push(emit(ordered[0].objectId, 'P→probe', startPole, probe.point))
    }
  }

  // First segment: start pole to first anchor (unless ignored)
  if (!opts?.ignorePoles && anchors2[0]) {
    segments.push(emit(ordered[0].objectId, `P→${idxOf(0)}` , startPole, anchors2[0]))
  }

  // Ring→ring segments
  for (let i = 0; i < ordered.length - 1; i += Math.max(1, measureEvery)) {
    const a = anchors2[i]
    const b = anchors2[i + 1]
    if (!a || !b) continue
    segments.push(emit(ordered[i].objectId, `${idxOf(i)}→${idxOf(i + 1)}`, a, b))
  }

  // Last segment: last anchor to end pole (unless ignored or end pole missing)
  if (!opts?.ignorePoles && endPole && anchors2[lastIdx]) {
    segments.push(emit(ordered[lastIdx].objectId, `${idxOf(lastIdx)}→P`, anchors2[lastIdx], endPole))
  }

  return segments
}


