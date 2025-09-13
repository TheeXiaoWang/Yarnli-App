import * as THREE from 'three'
import { averageRadiusFromPolyline } from '../../domain/nodes/utils'
import { buildStepV3 } from './buildStepV3'

export function planScaffoldChainV2({ layers, startKey, centerV, axisDir, currentNodes, distributeNextNodes, countNextStitches, targetSpacing, increaseFactor = 1, decreaseFactor = 1, incMode = 'even', decMode = 'even', spacingMode = 'even', increasePolicy = 'spread_out', snapToPolyline = true }) {
  // eslint-disable-next-line no-console
  console.log('[ScaffoldPlanner v2] planning', { layers: layers?.length ?? 0, increasePolicy })
  const chainSegments = []
  const chainByLayer = []
  const childMaps = []
  const allNextRings = []
  let prev = currentNodes.map(n => ({ p: [...n.p] }))
  let prevSegments = null

  for (const layer of layers) {
    const yNext = Number(layer.y)
    const rNext = averageRadiusFromPolyline(layer?.polylines?.[0], centerV) || 1
    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: 2 * Math.PI * (prev.length > 0 ? (prev.reduce((s, n) => s + Math.hypot(n.p[0]-centerV.x, n.p[2]-centerV.z), 0) / prev.length) : rNext),
      nextCircumference: 2 * Math.PI * rNext,
      yarnWidth: targetSpacing,
      increaseFactor,
      decreaseFactor,
      spacingMode,
      incMode,
      decMode,
      seed: Math.floor(yNext * 1000),
    })

    const { segments, nextCurrentNodes, parentToChildren, status } = buildStepV3({
      currentNodes: prev,
      layer,
      yNext,
      rNext,
      nextCount,
      center: [centerV.x, centerV.y, centerV.z],
      up: [axisDir.x, axisDir.y, axisDir.z],
      distributeNextNodes,
      prevSegments,
      increasePolicy,
      snapToPolyline,
    })

    const effectiveNextNodes = (status === 'need_split') ? prev : nextCurrentNodes
    const effectiveSegments = segments

    chainSegments.push(...effectiveSegments)
    chainByLayer.push({ y: yNext, segments: effectiveSegments })
    childMaps.push({ y: yNext, fromCount: prev.length, toCount: effectiveNextNodes.length, map: parentToChildren.map((arr, j) => ({ from: j, children: arr.slice() })) })
    prev = effectiveNextNodes
    prevSegments = effectiveSegments
    allNextRings.push({ y: yNext, nodes: effectiveNextNodes })
  }
  const firstNextNodesRing = allNextRings[0]?.nodes || []
  return { chainSegments, chainByLayer, childMaps, allNextRings, firstNextNodesRing }
}


