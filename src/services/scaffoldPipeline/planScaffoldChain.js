import * as THREE from 'three'
import { ringMetricsAlongAxisFromPoints } from '../../utils/nodes/radius'
import { polylineLengthProjected } from '../../utils/layers/circumference'
import { buildScaffoldStep } from './buildStep'

// Orchestrates the scaffolding across all layers using the consecutive mapping strategy.
export function planScaffoldChain({ layers, startKey, centerV, axisDir, currentNodes, distributeNextNodes, countNextStitches, targetSpacing, increaseFactor = 1, decreaseFactor = 1, incMode = 'even', decMode = 'even', spacingMode = 'even' }) {
  // eslint-disable-next-line no-console
  console.log('[ScaffoldPlanner v1] planning', { layers: layers?.length ?? 0 })
  const chainSegments = []
  const chainByLayer = []
  const childMaps = []
  const allNextRings = []
  let prev = currentNodes.map(n => ({ p: [...n.p] }))
  const epsKey = 1e-9
  const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z)
  if (n.lengthSq() < 1e-12) n.set(0,1,0)
  n.normalize()
  const axisOrigin = new THREE.Vector3(centerV.x, centerV.y, centerV.z).sub(n.clone().multiplyScalar(startKey))
  let lastYProcessed = null

  for (const layer of layers) {
    // Use projection along normalized axis for ordering/param
    let yNext = Number(layer.y)
    const poly = layer?.polylines?.[0]
    if (Array.isArray(poly) && poly.length > 0) {
      const mid = poly[Math.floor(poly.length / 2)]
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
        const delta = mv.clone().sub(centerV)
        yNext = startKey + n.dot(delta)
      }
    }
    // Only skip a duplicate if it is exactly the same param-position as the last processed layer.
    // This avoids dropping distinct early layers that are very close to the start anchor.
    if (prev.length > 1 && lastYProcessed != null) {
      const nearLast = Math.abs(yNext - lastYProcessed) <= epsKey
      const nearStart = Math.abs(yNext - startKey) <= epsKey
      if (nearLast && nearStart) continue
    }
    const centerAt = axisOrigin.clone().add(n.clone().multiplyScalar(yNext))
    const nextCircumference = Array.isArray(poly) ? polylineLengthProjected(poly, [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]) : 0
    const rNext = nextCircumference > 0 ? (nextCircumference / (2 * Math.PI)) : (ringMetricsAlongAxisFromPoints(poly || [], [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]).radius || 1)
    // derive stitch count to forward into distribution
    // Previous ring circumference using its centroid snapped onto axis
    let sx = 0, sy = 0, sz = 0
    for (const q of prev) { sx += q.p[0]; sy += q.p[1]; sz += q.p[2] }
    const centroidPrev = new THREE.Vector3(sx/Math.max(1,prev.length), sy/Math.max(1,prev.length), sz/Math.max(1,prev.length))
    const tPrev = n.dot(centroidPrev.clone().sub(axisOrigin))
    const centerPrev = axisOrigin.clone().add(n.clone().multiplyScalar(tPrev))
    const { circumference: curCirc } = ringMetricsAlongAxisFromPoints(prev.map(e => e.p), [centerPrev.x, centerPrev.y, centerPrev.z], [n.x, n.y, n.z])
    const nextCirc = 2 * Math.PI * rNext
    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: curCirc,
      nextCircumference: nextCirc,
      yarnWidth: targetSpacing,
      increaseFactor,
      decreaseFactor,
      spacingMode,
      incMode,
      decMode,
      seed: Math.floor(yNext * 1000),
    })

    const { segments, nextCurrentNodes, parentToChildren } = buildScaffoldStep({
      currentNodes: prev,
      layer,
      yNext,
      rNext,
      nextCount,
      center: [centerAt.x, centerAt.y, centerAt.z],
      up: [n.x, n.y, n.z],
      distributeNextNodes,
      aRef: (typeof aRef !== 'undefined' ? aRef : null),
    })
    chainSegments.push(...segments)
    chainByLayer.push({ y: yNext, segments })
    childMaps.push({ y: yNext, fromCount: prev.length, toCount: nextCurrentNodes.length, map: parentToChildren.map((arr, j) => ({ from: j, children: arr.slice() })) })
    prev = nextCurrentNodes
    lastYProcessed = yNext
    // Populate per-layer node rings for visuals (counts, sliders)
    allNextRings.push({ y: yNext, nodes: nextCurrentNodes, circumference: nextCircumference })
  }
  const firstNextNodesRing = allNextRings[0]?.nodes || []
  return { chainSegments, chainByLayer, childMaps, allNextRings, firstNextNodesRing }
}


