import * as THREE from 'three'
import { vec, segVector, segProjected } from '../utils'
import { nearestPointOnPolyline, intersectWithPlane, makeAzimuthFrame } from '../geometry/anchors'

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
  const anchorOnPlane = (layer, prev, planePoint) => useFixed
    ? intersectWithPlane(layer, planePoint, planeNormal, azimuthDir, prev || planePoint)
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

  // Build anchors strictly using the same rule for every ring
  // Enforce strict neighbor ordering along the stack axis, and ALWAYS start at the ring physically closest to the start pole.
  const meta = arr.map((layer) => {
    const c = centroid(layer) || startPole
    const t = ax.dot(c.clone().sub(startPole))
    const nearSeg = nearestPointOnPolyline(layer, startPole)
    const nearVert = nearestVertex(layer, startPole)
    const near = nearSeg || nearVert || c
    const dn = near.distanceTo(startPole)
    return { layer, c, t, dn }
  })
  meta.sort((a,b) => a.t - b.t)
  // Pick start ring: prefer the smallest-perimeter ring in the first axis-side window,
  // tie‑break by closest distance to the start pole. This favors the tiny first ring.
  const perimeterOf = (layer) => {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length < 2) return Number.EPSILON // treat degenerate tiny rings as smallest
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
  const windowCount = Math.max(1, Math.min(meta.length, Math.round(meta.length * 0.25)))
  let k = 0
  let bestPer = Infinity
  let bestDn = Infinity
  for (let i = 0; i < windowCount; i++) {
    const per = perimeterOf(meta[i].layer)
    const dn = meta[i].dn
    if (per < bestPer || (per === bestPer && dn < bestDn)) {
      bestPer = per
      bestDn = dn
      k = i
    }
  }
  // STRICT OVERRIDE: choose the ring with the smallest forward axial distance from the start pole
  // Prefer t >= 0 (in front of the start pole). If none, pick the minimal |t|.
  let kAxis = -1
  let bestT = Infinity
  for (let i = 0; i < meta.length; i++) {
    const t = meta[i].t
    if (t >= 0 && t < bestT) { bestT = t; kAxis = i }
  }
  if (kAxis < 0) {
    let bestAbs = Infinity
    for (let i = 0; i < meta.length; i++) {
      const at = Math.abs(meta[i].t)
      if (at < bestAbs) { bestAbs = at; kAxis = i }
    }
  }
  if (kAxis >= 0) k = kAxis
  const ordered = meta.slice(k).concat(meta.slice(0,k)).map(m => m.layer)
  const anchors = new Array(ordered.length).fill(null)
  const useNearestChain = !!opts?.forceNearestChain
  // For the very first ring, prefer the truly nearest point to ensure inclusion
  anchors[0] = anchorNearestOnly(ordered[0], startPole) || anchorOnPlane(ordered[0], startPole, startPole)
  for (let i = 1; i < ordered.length; i++) {
    const prev = anchors[i - 1] || startPole
    anchors[i] = useNearestChain
      ? anchorNearestOnly(ordered[i], prev)
      : (anchorOnPlane(ordered[i], prev, startPole) || nearestPointOnPolyline(ordered[i], prev))
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
  if (!opts?.ignorePoles && anchors2[0]) {
    const nearest0 = nearestPointOnPolyline(ordered[0], startPole)
    if (nearest0) {
      const dPref = startPole.distanceTo(anchors2[0])
      const dNear = startPole.distanceTo(nearest0)
      const gap = axialGap(startPole, ordered[0])
      if (dPref > maxRel * dNear || (Number.isFinite(gap) && gap > 0 && dPref > maxAxial * gap)) anchors2[0] = nearest0
    }
  }
  // Validate ring→ring chain
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
  // Symmetric to the first ring: re-aim the last ring anchor toward the end pole so it isn't skipped
  if (endPole) {
    const endCandidate = nearestPointOnPolyline(ordered[lastIdx], endPole)
      || anchorOnPlane(ordered[lastIdx], endPole, endPole)
      || nearestVertex(ordered[lastIdx], endPole)
    if (endCandidate) anchors2[lastIdx] = endCandidate
    if (anchors2[lastIdx] && anchors2[lastIdx].distanceTo(endPole) < epsilon) {
      anchors2[lastIdx] = endPole.clone()
    }
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
    segments.push(emit(ordered[0].objectId, 'P→0', startPole, anchors2[0]))
  }

  // Ring→ring segments
  for (let i = 0; i < ordered.length - 1; i += Math.max(1, measureEvery)) {
    const a = anchors2[i]
    const b = anchors2[i + 1]
    if (!a || !b) continue
    segments.push(emit(ordered[i].objectId, `${i}→${i + 1}`, a, b))
  }

  // Last segment: last anchor to end pole (unless ignored or end pole missing)
  if (!opts?.ignorePoles && endPole && anchors2[lastIdx]) {
    segments.push(emit(ordered[lastIdx].objectId, `${lastIdx}→P`, anchors2[lastIdx], endPole))
  }

  return segments
}


