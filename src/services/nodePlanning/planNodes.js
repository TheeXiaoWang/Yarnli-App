import * as THREE from 'three'
import { ringMetricsAlongAxisFromPoints } from '../../domain/nodes/utils/radius'
import { polylineLength3D, polylineLengthProjected } from '../../domain/layerlines/circumference'
import { rotateLayerStart } from '../../domain/nodes/utils/rotateLayerStart'
import { applyStrategy, isClosedLayer } from './layerStrategies'
import { buildScaffoldStep } from '../scaffoldPlanning/buildStep'

/**
 * Plan node placement across all layers with layer-type-specific strategies
 * 
 * This function orchestrates node placement for all layers, applying different
 * strategies based on layer type (closed vs open loops). It maintains serpentine
 * flip state across consecutive open layers and inserts chain stitches where needed.
 * 
 * @param {Object} params - Planning parameters
 * @param {Array} params.layers - Array of layer objects
 * @param {number} params.startKey - Start position along axis
 * @param {Object} params.centerV - Center vector {x, y, z}
 * @param {Object} params.axisDir - Axis direction vector {x, y, z}
 * @param {Array} params.currentNodes - Initial nodes (seed ring)
 * @param {Function} params.distributeNextNodes - Node distribution function
 * @param {Function} params.countNextStitches - Stitch counting function
 * @param {number} params.targetSpacing - Target spacing between nodes
 * @param {number} params.increaseFactor - Increase factor for growth
 * @param {number} params.decreaseFactor - Decrease factor for shrinkage
 * @param {string} params.incMode - Increase mode ('even' or 'jagged')
 * @param {string} params.decMode - Decrease mode ('even' or 'jagged')
 * @param {string} params.spacingMode - Spacing mode
 * @param {Map} params.idxMap - Optional layer ordering map
 * @param {Function} params.getStitchType - Function to get stitch type for layer
 * @param {Function} params.getYarnWidth - Function to get yarn width for stitch type
 * 
 * @returns {Object} - { nodesByLayer: Array<{y, nodes, circumference, stitchType}> }
 */
export function planNodes(params) {
  const {
    layers = [],
    startKey = 0,
    centerV = { x: 0, y: 0, z: 0 },
    axisDir = { x: 0, y: 1, z: 0 },
    currentNodes = [],
    distributeNextNodes,
    countNextStitches,
    targetSpacing = 0.5,
    increaseFactor = 1,
    decreaseFactor = 1,
    incMode = 'even',
    decMode = 'even',
    spacingMode = 'even',
    idxMap = null,
    getStitchType = () => 'sc',
    getYarnWidth = () => targetSpacing,
  } = params

  const nodesByLayer = []
  let prev = currentNodes.map(n => ({ p: [...n.p] }))
  let serpentineFlipState = false
  let lastAnchorNode0 = null

  const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z)
  if (n.lengthSq() < 1e-12) n.set(0, 1, 0)
  n.normalize()
  
  const axisOrigin = new THREE.Vector3(centerV.x, centerV.y, centerV.z)
    .sub(n.clone().multiplyScalar(startKey))

  // Helper: visible perimeter from cut arcs (sum of open polylines)
  const totalVisibleLength = (layer) => {
    const polys = Array.isArray(layer?.polylines) ? layer.polylines : []
    if (!polys.length) return 0
    let sum = 0
    for (const poly of polys) sum += polylineLength3D(poly, false)
    return sum
  }

  // Rotate nodes so that the entry closest to anchor becomes index 0
  const rotateToNearestAnchor = (nodes, anchor) => {
    if (!Array.isArray(nodes) || nodes.length === 0 || !Array.isArray(anchor) || anchor.length !== 3) return nodes
    let best = 0
    let bestD2 = Infinity
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i].p
      const dx = p[0] - anchor[0]
      const dy = p[1] - anchor[1]
      const dz = p[2] - anchor[2]
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < bestD2) { bestD2 = d2; best = i }
    }
    if (best === 0) return nodes
    return rotateLayerStart(nodes, best)
  }

  // Reassign ids to match array order (id 0 becomes first)
  const reassignIdsSequential = (nodes) => nodes.map((e, i) => ({ ...e, id: i }))

  // Use shared overlay order if provided; otherwise fall back to axis/tie-break ordering
  const orderedLayers = (() => {
    if (idxMap && typeof idxMap.get === 'function') {
      const ord = (layers || []).filter((l) => idxMap.has(l))
        .sort((a, b) => (idxMap.get(a) ?? 0) - (idxMap.get(b) ?? 0))
      return ord.map((layer, i) => ({ layer, key: i, idx: i, r: 0 }))
    }
    const epsKey = 1e-6
    const out = []
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      let yTmp = Number(layer.y)
      const polyTmp = layer?.polylines?.[0]
      if (Array.isArray(polyTmp) && polyTmp.length > 0) {
        const mid = polyTmp[Math.floor(polyTmp.length / 2)]
        if (Array.isArray(mid) && mid.length === 3) {
          const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
          const delta = mv.clone().sub(centerV)
          yTmp = startKey + n.dot(delta)
        }
      }
      const centerAtTie = new THREE.Vector3(centerV.x, centerV.y, centerV.z)
        .sub(n.clone().multiplyScalar(startKey))
        .add(n.clone().multiplyScalar(yTmp))
      const rTie = Array.isArray(polyTmp)
        ? (ringMetricsAlongAxisFromPoints(polyTmp, [centerAtTie.x, centerAtTie.y, centerAtTie.z], [n.x, n.y, n.z]).radius || 0)
        : 0
      out.push({ layer, key: yTmp, idx: i, r: rTie })
    }
    out.sort((a, b) => {
      const dk = a.key - b.key
      if (Math.abs(dk) <= epsKey) {
        const dr = (a.r - b.r)
        if (Math.abs(dr) > 1e-9) return dr
        return a.idx - b.idx
      }
      return dk
    })
    return out
  })()

  // Process each layer
  for (let ringIndex = 0; ringIndex < orderedLayers.length; ringIndex++) {
    const layer = orderedLayers[ringIndex].layer
    const isFirstLayer = ringIndex === 0
    const isLastLayer = ringIndex === orderedLayers.length - 1

    // Compute layer parameters
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

    const centerAt = axisOrigin.clone().add(n.clone().multiplyScalar(yNext))
    const projectedCirc = Array.isArray(poly) 
      ? polylineLengthProjected(poly, [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]) 
      : 0
    const rNext = projectedCirc > 0 
      ? (projectedCirc / (2 * Math.PI)) 
      : (ringMetricsAlongAxisFromPoints(poly || [], [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]).radius || 1)

    // Calculate circumference
    const L_vis = totalVisibleLength(layer)
    const fullCircle = 2 * Math.PI * Math.max(1e-9, rNext)
    const nextCircumference = L_vis > 0 ? L_vis : fullCircle

    // Get stitch type and yarn width for this layer
    const stitchType = getStitchType(layer, isFirstLayer, isLastLayer)
    const actualYarnWidth = getYarnWidth(stitchType, targetSpacing)

    // Calculate node count (this will be used by buildScaffoldStep)
    // For open layers with chain stitches, we need to account for the 2 extra chain nodes
    const isOpen = !isClosedLayer(layer)
    const chainStitchCount = isOpen ? 2 : 0

    // Count stitches based on circumference
    let sx = 0, sy = 0, sz = 0
    for (const q of prev) { sx += q.p[0]; sy += q.p[1]; sz += q.p[2] }
    const centroidPrev = new THREE.Vector3(
      sx / Math.max(1, prev.length), 
      sy / Math.max(1, prev.length), 
      sz / Math.max(1, prev.length)
    )
    const tPrev = n.dot(centroidPrev.clone().sub(axisOrigin))
    const centerPrev = axisOrigin.clone().add(n.clone().multiplyScalar(tPrev))
    const { circumference: curCirc } = ringMetricsAlongAxisFromPoints(
      prev.map(e => e.p), 
      [centerPrev.x, centerPrev.y, centerPrev.z], 
      [n.x, n.y, n.z]
    )

    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: curCirc,
      nextCircumference: nextCircumference,
      yarnWidth: actualYarnWidth,
      increaseFactor,
      decreaseFactor,
      spacingMode,
      incMode,
      decMode,
      seed: Math.floor(yNext * 1000),
    })

    // Add chain stitch count for open layers
    const totalNodeCount = nextCount + chainStitchCount

    // Use buildScaffoldStep to get node positions (we'll extract just the positions)
    // This maintains compatibility with existing node placement logic
    const stepResult = buildScaffoldStep({
      currentNodes: prev,
      layer,
      yNext,
      rNext,
      nextCount: totalNodeCount,
      center: [centerAt.x, centerAt.y, centerAt.z],
      sphereCenter: [centerV.x, centerV.y, centerV.z],
      maxCircumference: nextCircumference,
      up: [n.x, n.y, n.z],
      handedness: 'right',
      distributeNextNodes,
      yarnWidth: actualYarnWidth,
      stitchType: stitchType,
      tiltScale: 1.0,
    })

    // Extract node positions from buildScaffoldStep result
    const rawNodes = stepResult.nextCurrentNodes || []
    const nodePositions = rawNodes.map(node => node.p)

    // Apply layer-specific strategy to assign IDs and stitch types
    const strategyResult = applyStrategy({
      layer,
      nodePositions,
      nodeCount: totalNodeCount,
      flipState: serpentineFlipState,
      lastAnchor: lastAnchorNode0,
      stitchType,
    })

    let adjustedNodes = strategyResult.nodes
    serpentineFlipState = strategyResult.newFlipState

    // Rotate to nearest anchor if available
    if (lastAnchorNode0) {
      adjustedNodes = rotateToNearestAnchor(adjustedNodes, lastAnchorNode0)
    }
    adjustedNodes = reassignIdsSequential(adjustedNodes)

    // Update anchor for next layer
    if (adjustedNodes && adjustedNodes.length > 0) {
      lastAnchorNode0 = adjustedNodes[0].p.slice()
    }

    // Store nodes for this layer
    nodesByLayer.push({
      y: yNext,
      nodes: adjustedNodes,
      circumference: nextCircumference,
      stitchType,
    })

    // Update prev for next iteration
    prev = adjustedNodes
  }

  return { nodesByLayer }
}

