import * as THREE from 'three'
import { orderLayersAlongAxis } from '../../utils/layers/layerUtils'
import { buildStep } from './buildStep'

export function planChain({ layers, startCenter, endCenter, nodesResult, settings, alignByAzimuth }) {
  const centerV = new THREE.Vector3(startCenter.x, startCenter.y, startCenter.z)
  const axisDir = new THREE.Vector3(endCenter.x - startCenter.x, endCenter.y - startCenter.y, endCenter.z - startCenter.z)
  if (axisDir.lengthSq() < 1e-12) axisDir.set(0, 1, 0)
  axisDir.normalize()
  const metaCenterArr = [centerV.x, centerV.y, centerV.z]

  const increaseFactor = Number.isFinite(settings?.increaseFactor) ? settings.increaseFactor : 1.0
  const decreaseFactor = Number.isFinite(settings?.decreaseFactor) ? settings.decreaseFactor : 1.0
  const spacingMode = settings?.planSpacingMode || 'even'
  const incMode = settings?.planIncreaseMode || spacingMode
  const decMode = settings?.planDecreaseMode || spacingMode
  const targetSpacing = Math.max(1e-6, settings?.targetSpacing || 0.01)
  const spacingParams = { targetSpacing, increaseFactor, decreaseFactor, spacingMode, incMode, decMode }
  const handedness = settings?.handedness || 'right'

  // Order layers along axis relative to start center
  const ordered = orderLayersAlongAxis(layers || [], centerV, axisDir)

  let currentNodes = (nodesResult?.nodeRing0?.nodes || []).map(n => ({ p: [...n.p] }))
  let currentRadius = nodesResult?.nodeRing0?.meta?.radius || 1

  const chainSegments = []
  const chainByLayer = []
  const transitionOps = []
  const childMaps = []
  let prevSegs = null
  let firstNextNodesRing = null
  const allNextRings = []
  const spacingPerLayer = []
  const countsPerLayer = []
  countsPerLayer.push({ y: 0, count: currentNodes.length })

  for (const layer of ordered) {
    const step = buildStep({ layer, currentNodes, currentRadius, centerV, axisDir, spacingParams, alignByAzimuth, metaCenterArr, handedness, prevSegments: prevSegs })
    if (!firstNextNodesRing && step.nextRing) firstNextNodesRing = step.nextRing
    allNextRings.push({ y: layer.y, nodes: step.nextRing || [] })
    spacingPerLayer.push({ y: layer.y, spacing: step.spacing, p: step.nextRing?.[0]?.p || metaCenterArr })
    transitionOps.push({ y: layer.y, incs: step.incs, decs: step.decs, from: currentNodes.length, to: (step.nextRing || []).length })

    chainSegments.push(...step.segments)
    chainByLayer.push({ y: layer.y, segments: step.segments })
    childMaps.push({ y: layer.y, fromCount: currentNodes.length, toCount: (step.nextRing || []).length, map: step.childMap })

    currentNodes = step.nextCurrentNodes
    currentRadius = (step.nextRing && step.nextRing.length > 0) ? (new THREE.Vector3(...step.nextRing[0].p).distanceTo(centerV)) : currentRadius
    prevSegs = step.segments
    countsPerLayer.push({ y: layer.y, count: (step.nextRing || []).length })
  }

  return {
    chainSegments,
    chainByLayer,
    transitionOps,
    childMaps,
    firstNextNodesRing,
    allNextRings,
    spacingPerLayer,
    countsPerLayer,
  }
}


