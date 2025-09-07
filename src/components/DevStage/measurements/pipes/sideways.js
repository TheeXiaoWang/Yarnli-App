import * as THREE from 'three'
import { vec, segVector } from '../utils'
import { nearestPointOnPolyline, intersectWithPlane, makeAzimuthFrameFromRing, makeAzimuthFrame } from '../geometry/anchors'

// Dedicated pipe for sideways-oriented layer stacks (axis ~ horizontal).
// Always uses a fixed-azimuth plane to prevent zig-zagging anchors.
export function buildSidewaysSegments(arr, poles, axis, measureEvery = 1, opts = {}) {
  const segments = []
  if (!arr || arr.length === 0 || !poles || poles.length < 2) return segments
  const pA = vec(poles[0])
  const pB = vec(poles[1])

  // Build azimuth frame: use provided azimuthDeg when set; else derive from first ring
  const startGuess = vec(poles[0])
  const frame = Number.isFinite(opts?.azimuthDeg)
    ? makeAzimuthFrame(axis, opts.azimuthDeg)
    : makeAzimuthFrameFromRing(axis, arr[0], startGuess)
  const { planeNormal, azimuthDir } = frame
  const anchorOnPlane = (layer, prev, planePoint) => intersectWithPlane(layer, planePoint, planeNormal, azimuthDir, prev || planePoint)

  // Trust pole ordering from the caller (start, end)
  const startPole = pA

  const endPole = startPole.equals(pA) ? pB : pA
  // Sideways ordering: pick the smallest circumference layer near the start pole first,
  // then order remaining layers by axial projection from the start pole toward the end pole.
  const perimeterOf = (layer) => {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length < 2) return Infinity
    let sum = 0
    for (let i = 0; i < poly.length - 1; i++) {
      const a = new THREE.Vector3(...poly[i])
      const b = new THREE.Vector3(...poly[i + 1])
      sum += a.distanceTo(b)
    }
    // close loop
    const a0 = new THREE.Vector3(...poly[0])
    const an = new THREE.Vector3(...poly[poly.length - 1])
    sum += a0.distanceTo(an)
    return sum
  }
  const ax = axis.clone().normalize()
  // Estimate span along axis
  const span = (() => {
    const pAax = startPole.clone().dot(ax)
    const pBax = endPole.clone().dot(ax)
    return Math.abs(pBax - pAax) || 1
  })()
  let firstIdx = -1
  let bestPer = Infinity
  for (let i = 0; i < arr.length; i++) {
    const poly = arr[i]?.polylines?.[0]
    if (!poly || poly.length < 2) continue
    const c = new THREE.Vector3(...poly[Math.floor(poly.length / 2)])
    const t = Math.max(0, c.clone().sub(startPole).dot(ax))
    // consider only rings near the start side within 40% of the span
    if (t > span * 0.4) continue
    const per = perimeterOf(arr[i])
    if (per < bestPer) { bestPer = per; firstIdx = i }
  }
  // fallback: if no candidates in window, choose physically closest
  if (firstIdx < 0) {
    let bestD = Infinity
    for (let i = 0; i < arr.length; i++) {
      const np = nearestPointOnPolyline(arr[i], startPole)
      const d = np ? np.distanceTo(startPole) : Infinity
      if (d < bestD) { bestD = d; firstIdx = i }
    }
  }
  const others = arr.map((l, i) => ({ l, i })).filter(e => e.i !== firstIdx)
  others.sort((a, b) => {
    const ca = a.l?.polylines?.[0]
    const cb = b.l?.polylines?.[0]
    const pa = ca && ca.length ? new THREE.Vector3(...ca[Math.floor(ca.length/2)]) : startPole
    const pb = cb && cb.length ? new THREE.Vector3(...cb[Math.floor(cb.length/2)]) : startPole
    const ta = pa.clone().sub(startPole).dot(ax)
    const tb = pb.clone().sub(startPole).dot(ax)
    return ta - tb
  })
  const ordered = [arr[firstIdx], ...others.map(e => e.l)]
  // Build anchors strictly on the azimuth plane for continuity
  const anchors = new Array(ordered.length).fill(null)
  anchors[0] = anchorOnPlane(ordered[0], startPole, startPole) || nearestPointOnPolyline(ordered[0], startPole)
  for (let i = 1; i < ordered.length; i++) {
    const prev = anchors[i - 1] || startPole
    anchors[i] = anchorOnPlane(ordered[i], prev, startPole) || nearestPointOnPolyline(ordered[i], prev)
  }
  // Optionally snap last anchor to the pole if extremely close (do not re-intersect on a different plane)
  const epsilon = Number.isFinite(opts?.snapPoleEpsilon) ? opts.snapPoleEpsilon : 0.05
  const lastIdx = ordered.length - 1
  const anchors2 = anchors.slice()
  if (anchors2[lastIdx] && anchors2[lastIdx].distanceTo(endPole) < epsilon) {
    anchors2[lastIdx] = endPole.clone()
  }

  // Anchors are guaranteed above; no extra fallbacks

  if (!opts?.ignorePoles && anchors2[0]) {
    // Attach first segment exactly to the same anchor used by the ring→ring path (no substitution)
    segments.push(segVector(ordered[0].objectId, 'P→0', startPole, anchors2[0]))
  }
  for (let i = 0; i < ordered.length - 1; i += Math.max(1, measureEvery)) {
    const a = anchors2[i]
    const b = anchors2[i + 1]
    if (!a || !b) continue
    segments.push(segVector(ordered[i].objectId, `${i}→${i + 1}`, a, b))
  }
  if (!opts?.ignorePoles && anchors2[lastIdx]) {
    segments.push(segVector(ordered[lastIdx].objectId, `${lastIdx}→P`, anchors2[lastIdx], endPole))
  }
  return segments
}


