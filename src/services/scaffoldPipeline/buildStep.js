import * as THREE from 'three'
import { alignRingByAzimuth } from '../../utils/nodes'
import { nearestPointOnPolyline } from '../../components/measurements/utils'
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
}) {
  const metaCenterArr = center
  let { nodes: nextNodes } = distributeNextNodes({ yNext, rNext, nextCount, center: metaCenterArr, up, handedness })
  if (currentNodes && currentNodes.length > 0 && nextNodes && nextNodes.length > 0) {
    const aligned = alignRingByAzimuth(currentNodes.map(n => n.p), nextNodes.map(n => n.p), metaCenterArr)
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

  // Build segments from mapping
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


