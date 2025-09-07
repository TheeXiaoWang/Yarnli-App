import * as THREE from 'three'
import { alignNextRingByAzimuthAxis } from './alignNextRingByAzimuthAxis'
import { nearestPointOnPolyline } from '../../components/DevStage/measurements/utils'
import { resamplePolylineByArcLength } from '../../utils/layers/circumference'
import { mapBucketsMonotonic } from '../../nodes/transitions/mapBuckets'

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
}) {
  const metaCenterArr = center
  let { nodes: nextNodes } = distributeNextNodes({ yNext, rNext, nextCount, center: metaCenterArr, up, handedness })
  if (currentNodes && currentNodes.length > 0 && nextNodes && nextNodes.length > 0) {
    const aligned = alignNextRingByAzimuthAxis(currentNodes.map(n => n.p), nextNodes.map(n => n.p), metaCenterArr, up, handedness)
    nextNodes = aligned.map(p => ({ p }))
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
    const mappingOnEven = mapBucketsMonotonic(currentNodes, evenPts.map(p => ({ p })))
    parentToChildren = mappingOnEven.map.map((e) => e.children)
    const segs = []
    for (let j = 0; j < curN; j++) {
      const from = currentNodes[j].p
      const kids = parentToChildren[j] || []
      for (const k of kids) segs.push([from, evenPts[k] || evenPts[0]])
    }
    const nextCurrentNodes = evenPts.map((p) => ({ p }))
    return { segments: segs, nextCurrentNodes, parentToChildren }
  }

  // Build segments from mapping (fallback when no polyline)
  const segments = []
  for (let j = 0; j < curN; j++) {
    const from = currentNodes[j].p
    const children = parentToChildren[j] || []
    for (const k of children) {
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
  const nextCurrentNodes = Array.from({ length: nxtN }, (_, k) => ({ p: snapChild(k) }))

  return { segments: snapped, nextCurrentNodes, parentToChildren }
}


