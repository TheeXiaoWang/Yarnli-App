import { STITCH_TYPES } from '../../constants/stitchTypes'
import { DEFAULT_EDGE_GAP_RATIO } from './dynamicSpacing'

/**
 * Adjust node positions along a polyline to account for stitch-type-aware spacing
 * 
 * This function takes nodes that have already been positioned (with uniform spacing)
 * and adjusts their positions to maintain constant edge-to-edge gaps based on each
 * node's stitch type and width.
 * 
 * PROBLEM SOLVED:
 * - Nodes with different stitch types (chain, sc, edge) have different widths
 * - Uniform spacing causes incorrect edge-to-edge gaps
 * - This function redistributes nodes to maintain constant gaps
 * 
 * APPROACH:
 * 1. Calculate the total arc length of the node ring
 * 2. Calculate required spacing for each node based on its stitch type
 * 3. Redistribute nodes along the arc to match required spacings
 * 
 * @param {Array} nodes - Array of node objects with {id, p: [x,y,z], stitchType}
 * @param {Object} params - Parameters
 * @param {number} params.baseYarnWidth - Base yarn width from yarn size level
 * @param {number} params.edgeGapRatio - Edge-to-edge gap ratio (default: DEFAULT_EDGE_GAP_RATIO)
 * @param {boolean} params.closed - Whether the node ring is closed (default: true)
 * @param {Array} params.center - Center point [x, y, z] for circular adjustment
 * 
 * @returns {Array} Array of adjusted nodes with updated positions
 */
export function adjustNodeSpacingByStitchType(nodes, params = {}) {
  const {
    baseYarnWidth = 0.5,
    edgeGapRatio = DEFAULT_EDGE_GAP_RATIO,
    closed = true,
    center = null,
  } = params

  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  if (nodes.length === 1) return nodes // Single node doesn't need adjustment

  // Check if all nodes have the same stitch type
  const stitchTypes = nodes.map(n => n.stitchType || 'sc')
  const allSame = stitchTypes.every(st => st === stitchTypes[0])
  
  // If all stitch types are the same, no adjustment needed
  if (allSame) return nodes

  // Calculate center-to-center spacing for each node
  const centerSpacings = stitchTypes.map(stitchType => {
    const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
    const widthMul = profile.widthMul ?? 1.0
    const visualWidth = baseYarnWidth * widthMul
    const edgeGap = baseYarnWidth * edgeGapRatio
    return edgeGap + visualWidth
  })

  // Calculate total arc length of current node positions
  let totalCurrentLength = 0
  for (let i = 0; i < nodes.length; i++) {
    const nextIndex = closed ? (i + 1) % nodes.length : i + 1
    if (nextIndex < nodes.length) {
      const p0 = nodes[i].p
      const p1 = nodes[nextIndex].p
      const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
      totalCurrentLength += dist
    }
  }

  // Calculate total required length based on stitch types
  const totalRequiredLength = centerSpacings.reduce((sum, spacing) => sum + spacing, 0)

  // If we're working with a circular ring and have a center, use angular distribution
  if (closed && center && Array.isArray(center) && center.length === 3) {
    return adjustNodeSpacingCircular(nodes, centerSpacings, center, totalCurrentLength, totalRequiredLength)
  }

  // Otherwise, use linear distribution along the arc
  return adjustNodeSpacingLinear(nodes, centerSpacings, totalCurrentLength, totalRequiredLength, closed)
}

/**
 * Adjust node spacing for circular rings (closed loops)
 * 
 * Uses angular distribution around a center point to maintain proper spacing.
 */
function adjustNodeSpacingCircular(nodes, centerSpacings, center, totalCurrentLength, totalRequiredLength) {
  const centerVec = [center[0], center[1], center[2]]
  
  // Calculate radius from first node to center
  const p0 = nodes[0].p
  const radius = Math.hypot(p0[0] - centerVec[0], p0[1] - centerVec[1], p0[2] - centerVec[2])
  
  if (radius < 1e-9) return nodes // Degenerate case
  
  // Calculate total angle span (should be 2π for closed rings)
  const totalAngle = 2 * Math.PI
  
  // Scale factor to fit nodes within available circumference
  const scaleFactor = totalCurrentLength / Math.max(totalRequiredLength, 1e-9)
  
  // Calculate angular positions for each node
  const adjustedNodes = []
  let cumulativeAngle = 0
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    
    // Calculate angle for this node
    // For first node, start at half spacing; for others, add full spacing
    if (i === 0) {
      const arcLength = (centerSpacings[0] * scaleFactor) / 2
      cumulativeAngle = arcLength / radius
    } else {
      const arcLength = centerSpacings[i] * scaleFactor
      cumulativeAngle += arcLength / radius
    }
    
    // Wrap angle to [0, 2π]
    const angle = cumulativeAngle % totalAngle
    
    // Calculate new position on the circle
    // Preserve the Y coordinate (layer height)
    const y = node.p[1]
    const x = centerVec[0] + radius * Math.cos(angle)
    const z = centerVec[2] + radius * Math.sin(angle)
    
    adjustedNodes.push({
      ...node,
      p: [x, y, z],
    })
  }
  
  return adjustedNodes
}

/**
 * Adjust node spacing for linear arcs (open loops or linear segments)
 * 
 * Redistributes nodes along the existing arc path.
 */
function adjustNodeSpacingLinear(nodes, centerSpacings, totalCurrentLength, totalRequiredLength, closed) {
  // Build cumulative arc length array for current positions
  const cumLengths = [0]
  for (let i = 1; i < nodes.length; i++) {
    const p0 = nodes[i - 1].p
    const p1 = nodes[i].p
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    cumLengths.push(cumLengths[cumLengths.length - 1] + dist)
  }
  
  if (closed && nodes.length > 1) {
    const p0 = nodes[nodes.length - 1].p
    const p1 = nodes[0].p
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    cumLengths.push(cumLengths[cumLengths.length - 1] + dist)
  }
  
  const totalLength = cumLengths[cumLengths.length - 1]
  if (totalLength < 1e-9) return nodes
  
  // Scale factor to fit nodes within available arc length
  const scaleFactor = totalLength / Math.max(totalRequiredLength, 1e-9)
  
  // Calculate new positions for each node
  const adjustedNodes = []
  let cumulativeDistance = 0
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    
    // Calculate target distance along the arc
    if (i === 0) {
      cumulativeDistance = (centerSpacings[0] * scaleFactor) / 2
    } else {
      cumulativeDistance += centerSpacings[i] * scaleFactor
    }
    
    // Wrap for closed arcs
    let targetDistance = cumulativeDistance
    if (closed) {
      targetDistance = targetDistance % totalLength
    } else {
      targetDistance = Math.min(targetDistance, totalLength)
    }
    
    // Find segment containing this distance
    let segmentIndex = 0
    for (let j = 1; j < cumLengths.length; j++) {
      if (cumLengths[j] >= targetDistance) {
        segmentIndex = j - 1
        break
      }
    }
    
    // Interpolate within segment
    const segStart = cumLengths[segmentIndex]
    const segEnd = cumLengths[segmentIndex + 1] || cumLengths[segmentIndex]
    const segLength = segEnd - segStart
    
    let t = 0
    if (segLength > 1e-9) {
      t = (targetDistance - segStart) / segLength
    }
    
    // Get segment endpoints
    const nodeIndex0 = segmentIndex % nodes.length
    const nodeIndex1 = (segmentIndex + 1) % nodes.length
    const p0 = nodes[nodeIndex0].p
    const p1 = nodes[nodeIndex1].p
    
    // Interpolate position
    const x = p0[0] + t * (p1[0] - p0[0])
    const y = p0[1] + t * (p1[1] - p0[1])
    const z = p0[2] + t * (p1[2] - p0[2])
    
    adjustedNodes.push({
      ...node,
      p: [x, y, z],
    })
  }
  
  return adjustedNodes
}

/**
 * Calculate the scale factor needed to fit nodes with varying widths
 * 
 * This is useful for debugging and validation.
 * 
 * @param {Array} nodes - Array of nodes with stitchType
 * @param {number} baseYarnWidth - Base yarn width
 * @param {number} edgeGapRatio - Edge gap ratio
 * @returns {Object} { scaleFactor, totalRequiredLength, totalCurrentLength, fits }
 */
export function calculateNodeSpacingScaleFactor(nodes, baseYarnWidth, edgeGapRatio = DEFAULT_EDGE_GAP_RATIO) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { scaleFactor: 1, totalRequiredLength: 0, totalCurrentLength: 0, fits: true }
  }
  
  // Calculate current total length
  let totalCurrentLength = 0
  for (let i = 0; i < nodes.length; i++) {
    const nextIndex = (i + 1) % nodes.length
    const p0 = nodes[i].p
    const p1 = nodes[nextIndex].p
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    totalCurrentLength += dist
  }
  
  // Calculate required length based on stitch types
  const stitchTypes = nodes.map(n => n.stitchType || 'sc')
  const centerSpacings = stitchTypes.map(stitchType => {
    const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
    const widthMul = profile.widthMul ?? 1.0
    const visualWidth = baseYarnWidth * widthMul
    const edgeGap = baseYarnWidth * edgeGapRatio
    return edgeGap + visualWidth
  })
  
  const totalRequiredLength = centerSpacings.reduce((sum, spacing) => sum + spacing, 0)
  const scaleFactor = totalCurrentLength / Math.max(totalRequiredLength, 1e-9)
  const fits = scaleFactor >= 1.0
  
  return {
    scaleFactor,
    totalRequiredLength,
    totalCurrentLength,
    fits,
    centerSpacings,
  }
}

