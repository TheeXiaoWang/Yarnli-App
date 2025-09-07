import { vec, segProjected } from '../utils'
import { makeAzimuthFrame, intersectWithPlane } from '../geometry/anchors'

// Fallback pipe for non-sphere objects: uses projected distances along the pole axis
export function buildGenericSegments(arr, poles, axis, measureEvery = 1, opts = {}) {
  const segments = []
  const objectId = arr[0]?.objectId ?? 'unknown'
  const pole = poles && poles[0] ? vec(poles[0]) : null
  const endPole = poles && poles[1] ? vec(poles[1]) : null
  
  if (pole && arr.length > 0) {
    const ordered = arr.slice()
    
    // Build azimuth frame for consistent anchor placement
    const azimuthFrame = makeAzimuthFrame(pole, axis, opts.azimuthDeg || 0)
    
    // Compute all anchors on the azimuth plane
    const anchors = []
    for (const ring of ordered) {
      const anchor = intersectWithPlane(ring.points, azimuthFrame.plane, azimuthFrame.planePoint)
      anchors.push(anchor)
    }
    
    // Build segments using the same anchors for continuity
    if (!opts?.ignorePoles && anchors[0]) {
      segments.push(segProjected(objectId, 'P→0', pole, anchors[0], axis))
    }
    
    for (let i = 0; i < ordered.length - 1; i += Math.max(1, measureEvery)) {
      const a = anchors[i]
      const b = anchors[i + 1]
      if (!a || !b) continue
      segments.push(segProjected(objectId, `${ordered[i].sIndex}→${ordered[i + 1].sIndex}`, a, b, axis))
    }
    
    if (!opts?.ignorePoles && endPole && anchors[ordered.length - 1]) {
      // Adjust last anchor toward end pole and snap if close
      const lastAnchor = anchors[ordered.length - 1]
      const distanceToEnd = lastAnchor.distanceTo(endPole)
      if (distanceToEnd < (opts.snapPoleEpsilon || 0.05)) {
        segments.push(segProjected(objectId, `${ordered[ordered.length - 1].sIndex}→P`, lastAnchor, endPole, axis))
      } else {
        segments.push(segProjected(objectId, `${ordered[ordered.length - 1].sIndex}→P`, lastAnchor, endPole, axis))
      }
    }
    
    return segments
  }
  return segments
}


