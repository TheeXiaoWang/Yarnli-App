import * as THREE from 'three'
import { averageRadiusFromPolyline } from '../../domain/nodes/utils'
import { buildScaffoldStep } from './buildStep'
import { resetTiltTrend } from '../nodes/buildNodes'

export function planScaffoldChainV2({ layers, startKey, centerV, axisDir, currentNodes, distributeNextNodes, countNextStitches, targetSpacing, increaseFactor = 1, decreaseFactor = 1, incMode = 'even', decMode = 'even', spacingMode = 'even', increasePolicy = 'spread_out', snapToPolyline = true }) {
  // eslint-disable-next-line no-console
  console.log('[ScaffoldPlanner v2] planning', { layers: layers?.length ?? 0, increasePolicy })
  const chainSegments = []
  const chainByLayer = []
  const childMaps = []
  const allNextRings = []
  let prev = currentNodes.map(n => ({ p: [...n.p] }))
  let prevSegments = null

  // Helper function to detect if a layer is a cut layer (open polylines)
  const isCutLayer = (layer) => {
    return Array.isArray(layer?.polylines) && layer.polylines.length > 1
  }

  // Helper function to get adjusted yarn width for first/last layers
  const getAdjustedYarnWidth = (layer, isFirstLayer, isLastLayer) => {
    const isCut = isCutLayer(layer)
    if ((isFirstLayer || isLastLayer) && !isCut) {
      return targetSpacing * 0.6  // Use 0.6x instead of 0.3x to match stitch type
    }
    return targetSpacing
  }

  // Helper function to get stitch type for first/last layers
  const getStitchType = (layer, isFirstLayer, isLastLayer) => {
    const isCut = isCutLayer(layer)
    if ((isFirstLayer || isLastLayer) && !isCut) {
      return 'edge'  // Use edge stitch type for both first and last layers
    }
    return 'sc'  // Default to single crochet
  }

  try { resetTiltTrend() } catch (_) {}
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex]
    const isFirstLayer = layerIndex === 0
    const isLastLayer = layerIndex === layers.length - 1
    
    const yNext = Number(layer.y)
    const rNext = averageRadiusFromPolyline(layer?.polylines?.[0], centerV) || 1
    
    // Use adjusted yarn width for first and last layers (when not cut layers)
    const adjustedYarnWidth = getAdjustedYarnWidth(layer, isFirstLayer, isLastLayer)
    
    // Get stitch type for first/last layers
    const stitchType = getStitchType(layer, isFirstLayer, isLastLayer)
    
    // Calculate circumference from geometry; do not force a circle on the last layer
    let nextCircumference = 2 * Math.PI * rNext
    
    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: 2 * Math.PI * (prev.length > 0 ? (prev.reduce((s, n) => s + Math.hypot(n.p[0]-centerV.x, n.p[2]-centerV.z), 0) / prev.length) : rNext),
      nextCircumference: nextCircumference,
      yarnWidth: adjustedYarnWidth,
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
      sphereCenter: [centerV.x, centerV.y, centerV.z],
      maxCircumference: 0,
      up: [axisDir.x, axisDir.y, axisDir.z],
      distributeNextNodes,
      yarnWidth: adjustedYarnWidth,
      stitchType: stitchType,
      // Tilt scale is computed dynamically in buildStep based on layer meta
    })

    const effectiveNextNodes = nextCurrentNodes
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


