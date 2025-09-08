import * as THREE from 'three'
import { vec, segVector } from '../utils'
import { nearestPointOnPolyline, intersectWithPlane, makeAzimuthFrame } from '../geometry/anchors'
import { buildFacingFrame, pickStableAnchor } from '../geometry/stableAnchors'
import { buildStackAnchors } from '../geometry/stackAnchors'

export function buildSphereSegments(arr, poles, axis, measureEvery = 1, opts = {}) {
  const segments = []
  const pA = vec(poles[0])
  const pB = vec(poles[1])

  const { useFixed, planeNormal, azimuthDir } = makeAzimuthFrame(axis, opts?.azimuthDeg)

  const anchorOnPlane = (layer, prev, planePoint) => intersectWithPlane(layer, planePoint, planeNormal, azimuthDir, prev)
  const anchorOf = (layer, prev) => (useFixed ? anchorOnPlane(layer, prev, pA) : nearestPointOnPolyline(layer, prev))

  const firstA = anchorOf(arr[0], pA)
  const firstB = anchorOf(arr[0], pB)
  const startPole = (() => {
    if (firstA && firstB) return firstA.distanceTo(pA) <= firstB.distanceTo(pB) ? pA : pB
    if (firstA) return pA
    if (firstB) return pB
    return pA
  })()
  const endPole = startPole.equals(pA) ? pB : pA

  // Deterministic stack anchors across the entire ordered list
  // Keep input order for spheres; anchors will align via plane intersections
  const ordered = arr.slice()
  const built = useFixed
    ? { anchors: ordered.map((layer) => anchorOnPlane(layer, null, startPole)) }
    : buildStackAnchors(ordered, [startPole, endPole], axis, { maxDrift: Infinity })
  const anchors = built.anchors
  // Optionally snap last anchor to the pole if extremely close (keep same plane for continuity)
  const epsilon = Number.isFinite(opts?.snapPoleEpsilon) ? opts.snapPoleEpsilon : 0.05
  const lastIdx = ordered.length - 1
  const anchors2 = anchors.slice()
  if (anchors2[lastIdx] && anchors2[lastIdx].distanceTo(endPole) < epsilon) {
    anchors2[lastIdx] = endPole.clone()
  }
  // Ensure first two anchors exist
  if (!anchors2[0]) anchors2[0] = anchorOnPlane(ordered[0], startPole, startPole) || nearestPointOnPolyline(ordered[0], startPole)
  if (ordered.length > 1 && !anchors2[1] && anchors2[0]) {
    anchors2[1] = anchorOnPlane(ordered[1], anchors2[0], startPole) || nearestPointOnPolyline(ordered[1], anchors2[0])
  }

  if (!opts?.ignorePoles && anchors2[0]) {
    const poleSpan = startPole.distanceTo(endPole)
    let tgt = nearestPointOnPolyline(ordered[0], startPole) || anchors2[0]
    const snapEps = Number.isFinite(opts?.snapPoleEpsilon) ? opts.snapPoleEpsilon : 0.05
    if (!tgt || tgt.distanceTo(endPole) < snapEps || startPole.distanceTo(tgt) > 0.8 * poleSpan) {
      const repl = nearestPointOnPolyline(ordered[0], startPole) || anchorOnPlane(ordered[0], startPole, startPole)
      if (repl) tgt = repl
    }
    segments.push(segVector(ordered[0].objectId, 'P→0', startPole, tgt))
  }
  for (let i = 0; i < ordered.length - 1; i += Math.max(1, measureEvery)) {
    const a = anchors2[i]
    const b = anchors2[i + 1]
    if (!a || !b) continue
    segments.push(segVector(ordered[i].objectId, `${i}→${i + 1}`, a, b))
  }
  if (!opts?.ignorePoles && anchors2[ordered.length - 1]) {
    const lastIdx2 = ordered.length - 1
    segments.push(segVector(ordered[lastIdx2].objectId, `${lastIdx2}→P`, anchors2[lastIdx2], endPole))
  }
  return segments
}


