import * as THREE from 'three'
import { averageRadiusFromPolyline } from '../../utils/nodes'
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

  for (const layer of layers) {
    const yNext = Number(layer.y)
    const rNext = averageRadiusFromPolyline(layer?.polylines?.[0], centerV) || 1
    // derive stitch count to forward into distribution
    const curCirc = (() => {
      const r = (() => {
        if (!Array.isArray(prev) || prev.length === 0) return rNext
        const cx = prev.reduce((s, n) => s + n.p[0], 0) / prev.length
        const cz = prev.reduce((s, n) => s + n.p[2], 0) / prev.length
        const dx = prev[0].p[0] - cx
        const dz = prev[0].p[2] - cz
        return Math.sqrt(dx*dx + dz*dz)
      })()
      return 2 * Math.PI * r
    })()
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
      center: [centerV.x, centerV.y, centerV.z],
      up: [axisDir.x, axisDir.y, axisDir.z],
      distributeNextNodes,
    })
    chainSegments.push(...segments)
    chainByLayer.push({ y: yNext, segments })
    childMaps.push({ y: yNext, fromCount: prev.length, toCount: nextCurrentNodes.length, map: parentToChildren.map((arr, j) => ({ from: j, children: arr.slice() })) })
    prev = nextCurrentNodes
    // Populate per-layer node rings for visuals (counts, sliders)
    allNextRings.push({ y: yNext, nodes: nextCurrentNodes })
  }
  const firstNextNodesRing = allNextRings[0]?.nodes || []
  return { chainSegments, chainByLayer, childMaps, allNextRings, firstNextNodesRing }
}


