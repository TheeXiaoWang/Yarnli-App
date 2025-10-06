import * as THREE from 'three'
import { STITCH_TYPES } from '../../constants/stitchTypes'
import { DEFAULT_EDGE_GAP_RATIO } from '../../services/nodePlanning/dynamicSpacing'

/**
 * Resample a polyline with stitch-type-aware spacing
 * 
 * This function distributes nodes along a polyline while accounting for each node's
 * individual stitch type and width. It maintains constant edge-to-edge gaps between
 * nodes regardless of their stitch types.
 * 
 * PROBLEM SOLVED:
 * - Previous implementation: All nodes spaced uniformly (arc_length / node_count)
 * - New implementation: Nodes spaced according to their individual widths
 * 
 * EXAMPLE:
 * Layer with 2 chain stitches (widthMul: 0.5) and 3 sc stitches (widthMul: 1.0):
 * - Old spacing: [0.2, 0.4, 0.6, 0.8, 1.0] (uniform)
 * - New spacing: [0.1, 0.2, 0.5, 0.8, 1.0] (adjusted for widths)
 * 
 * @param {Array} polyline - Array of 3D points [[x,y,z], ...]
 * @param {Array} stitchTypes - Array of stitch type strings ['chain', 'chain', 'sc', 'sc', 'sc']
 * @param {Object} params - Additional parameters
 * @param {number} params.baseYarnWidth - Base yarn width from yarn size level
 * @param {number} params.edgeGapRatio - Edge-to-edge gap ratio (default: DEFAULT_EDGE_GAP_RATIO)
 * @param {boolean} params.closed - Whether the polyline is closed (default: true)
 * 
 * @returns {Array} Array of resampled 3D points
 */
export function resamplePolylineByStitchWidth(polyline, stitchTypes, params = {}) {
  const {
    baseYarnWidth = 0.5,
    edgeGapRatio = DEFAULT_EDGE_GAP_RATIO,
    closed = true,
  } = params

  if (!Array.isArray(polyline) || polyline.length === 0) return []
  if (!Array.isArray(stitchTypes) || stitchTypes.length === 0) return []

  const nodeCount = stitchTypes.length

  // Build cumulative arc length array for the polyline
  const pts = polyline.slice()
  if (closed && pts.length >= 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dist = Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2])
    if (dist > 1e-6) {
      pts.push([first[0], first[1], first[2]])
    }
  }

  const cumLengths = [0]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    cumLengths.push(cumLengths[cumLengths.length - 1] + d)
  }

  const totalLength = cumLengths[cumLengths.length - 1]
  if (totalLength < 1e-9) return polyline.slice(0, nodeCount)

  // Calculate center spacing for each node based on its stitch type
  const centerSpacings = stitchTypes.map(stitchType => {
    const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
    const widthMul = profile.widthMul ?? 1.0
    const visualWidth = baseYarnWidth * widthMul
    const edgeGap = baseYarnWidth * edgeGapRatio
    return edgeGap + visualWidth
  })

  // Calculate total required length for all nodes
  const totalRequiredLength = centerSpacings.reduce((sum, spacing) => sum + spacing, 0)

  // Scale factor to fit nodes within available arc length
  // If nodes don't fit, we compress them proportionally
  const scaleFactor = totalLength / Math.max(totalRequiredLength, 1e-9)

  // Calculate cumulative positions along the polyline for each node
  const nodePositions = []
  let cumulativeDistance = 0

  for (let i = 0; i < nodeCount; i++) {
    // For the first node, start at half the spacing (centered)
    // For subsequent nodes, add the full spacing from the previous node
    if (i === 0) {
      cumulativeDistance = (centerSpacings[0] * scaleFactor) / 2
    } else {
      cumulativeDistance += centerSpacings[i] * scaleFactor
    }

    // Wrap around for closed polylines
    let targetDistance = cumulativeDistance
    if (closed) {
      targetDistance = targetDistance % totalLength
    } else {
      targetDistance = Math.min(targetDistance, totalLength)
    }

    // Find the segment containing this distance
    let segmentIndex = 0
    for (let j = 1; j < cumLengths.length; j++) {
      if (cumLengths[j] >= targetDistance) {
        segmentIndex = j - 1
        break
      }
    }

    // Interpolate within the segment
    const segStart = cumLengths[segmentIndex]
    const segEnd = cumLengths[segmentIndex + 1] || cumLengths[segmentIndex]
    const segLength = segEnd - segStart

    let t = 0
    if (segLength > 1e-9) {
      t = (targetDistance - segStart) / segLength
    }

    const p0 = pts[segmentIndex]
    const p1 = pts[segmentIndex + 1] || pts[segmentIndex]

    const x = p0[0] + t * (p1[0] - p0[0])
    const y = p0[1] + t * (p1[1] - p0[1])
    const z = p0[2] + t * (p1[2] - p0[2])

    nodePositions.push([x, y, z])
  }

  return nodePositions
}

/**
 * Helper function to interpolate a point along a polyline at a specific arc length
 * 
 * @param {Array} polyline - Array of 3D points
 * @param {Array} cumLengths - Cumulative arc lengths
 * @param {number} targetDistance - Target distance along the polyline
 * @returns {Array} Interpolated 3D point [x, y, z]
 */
function interpolateAtDistance(polyline, cumLengths, targetDistance) {
  if (polyline.length === 0) return [0, 0, 0]
  if (polyline.length === 1) return polyline[0].slice()

  // Find the segment containing this distance
  let segmentIndex = 0
  for (let j = 1; j < cumLengths.length; j++) {
    if (cumLengths[j] >= targetDistance) {
      segmentIndex = j - 1
      break
    }
  }

  // Handle edge case: target beyond last segment
  if (segmentIndex >= polyline.length - 1) {
    return polyline[polyline.length - 1].slice()
  }

  // Interpolate within the segment
  const segStart = cumLengths[segmentIndex]
  const segEnd = cumLengths[segmentIndex + 1]
  const segLength = segEnd - segStart

  let t = 0
  if (segLength > 1e-9) {
    t = (targetDistance - segStart) / segLength
  }

  const p0 = polyline[segmentIndex]
  const p1 = polyline[segmentIndex + 1]

  const x = p0[0] + t * (p1[0] - p0[0])
  const y = p0[1] + t * (p1[1] - p0[1])
  const z = p0[2] + t * (p1[2] - p0[2])

  return [x, y, z]
}

/**
 * Calculate the scale factor needed to fit nodes with varying widths into a polyline
 * 
 * This is useful for debugging and validation.
 * 
 * @param {number} totalLength - Total arc length of the polyline
 * @param {Array} stitchTypes - Array of stitch type strings
 * @param {number} baseYarnWidth - Base yarn width
 * @param {number} edgeGapRatio - Edge gap ratio
 * @returns {Object} { scaleFactor, totalRequiredLength, fits }
 */
export function calculateStitchWidthScaleFactor(totalLength, stitchTypes, baseYarnWidth, edgeGapRatio = DEFAULT_EDGE_GAP_RATIO) {
  const centerSpacings = stitchTypes.map(stitchType => {
    const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
    const widthMul = profile.widthMul ?? 1.0
    const visualWidth = baseYarnWidth * widthMul
    const edgeGap = baseYarnWidth * edgeGapRatio
    return edgeGap + visualWidth
  })

  const totalRequiredLength = centerSpacings.reduce((sum, spacing) => sum + spacing, 0)
  const scaleFactor = totalLength / Math.max(totalRequiredLength, 1e-9)
  const fits = scaleFactor >= 1.0

  return {
    scaleFactor,
    totalRequiredLength,
    totalLength,
    fits,
    centerSpacings,
  }
}

/**
 * Validate that stitch-width-aware spacing maintains constant edge-to-edge gaps
 * 
 * This is a debugging utility to verify the spacing logic.
 * 
 * @param {Array} nodePositions - Array of node positions
 * @param {Array} stitchTypes - Array of stitch types
 * @param {number} baseYarnWidth - Base yarn width
 * @param {number} edgeGapRatio - Edge gap ratio
 * @returns {Object} { isValid, gaps, expectedGap }
 */
export function validateStitchWidthSpacing(nodePositions, stitchTypes, baseYarnWidth, edgeGapRatio = DEFAULT_EDGE_GAP_RATIO) {
  if (nodePositions.length !== stitchTypes.length) {
    return { isValid: false, error: 'Mismatched lengths' }
  }

  const expectedGap = baseYarnWidth * edgeGapRatio
  const gaps = []

  for (let i = 0; i < nodePositions.length; i++) {
    const nextIndex = (i + 1) % nodePositions.length
    const p0 = nodePositions[i]
    const p1 = nodePositions[nextIndex]

    const centerDistance = Math.hypot(
      p1[0] - p0[0],
      p1[1] - p0[1],
      p1[2] - p0[2]
    )

    const profile0 = STITCH_TYPES[stitchTypes[i]] || STITCH_TYPES.sc
    const profile1 = STITCH_TYPES[stitchTypes[nextIndex]] || STITCH_TYPES.sc

    const width0 = baseYarnWidth * (profile0.widthMul ?? 1.0)
    const width1 = baseYarnWidth * (profile1.widthMul ?? 1.0)

    // Edge-to-edge gap = center distance - (half of each node's width)
    const edgeGap = centerDistance - (width0 / 2) - (width1 / 2)

    gaps.push({
      from: i,
      to: nextIndex,
      centerDistance,
      edgeGap,
      expectedGap,
      error: Math.abs(edgeGap - expectedGap),
    })
  }

  const maxError = Math.max(...gaps.map(g => g.error))
  const isValid = maxError < expectedGap * 0.1 // Allow 10% tolerance

  return {
    isValid,
    gaps,
    expectedGap,
    maxError,
  }
}

