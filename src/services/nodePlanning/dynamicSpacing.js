import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import { STITCH_TYPES } from '../../constants/stitchTypes'

/**
 * Dynamic Node Spacing Module
 * 
 * PURPOSE:
 * Decouples visual node size (widthMul) from geometric spacing along layerlines.
 * Ensures nodes are spaced edge-to-edge with consistent gaps, regardless of visual size changes.
 * 
 * PROBLEM SOLVED:
 * Previously, changing widthMul affected both:
 * 1. Visual node size (how big nodes appear)
 * 2. Geometric spacing (how far apart node centers are)
 * 
 * This caused unwanted behavior:
 * - Increasing widthMul → nodes spread apart (gaps appear)
 * - Decreasing widthMul → nodes squish together (overlaps occur)
 * 
 * NEW BEHAVIOR:
 * - Edge-to-edge spacing remains constant when widthMul changes
 * - If widthMul increases (bigger nodes), centers move closer to maintain edge gap
 * - If widthMul decreases (smaller nodes), centers move farther to maintain edge gap
 * 
 * FORMULA:
 * centerSpacing = edgeToEdgeGap + nodeVisualWidth
 * 
 * Where:
 * - edgeToEdgeGap = constant gap between node edges (independent of widthMul)
 * - nodeVisualWidth = baseDims.width * widthMul (visual size)
 */

/**
 * Default edge-to-edge gap ratio
 * This represents the desired gap between node edges as a fraction of base yarn width
 *
 * Example: 0.05 means 5% of base yarn width as gap between nodes
 * Adjust this value to control how tightly nodes are packed:
 * - Lower values (0.02-0.05): Very tight packing, minimal gaps
 * - Medium values (0.1-0.15): Moderate packing, small gaps
 * - Higher values (0.25-0.35): Looser packing, more visible gaps
 */
export const DEFAULT_EDGE_GAP_RATIO = 0.15

/**
 * Compute target center-to-center spacing for nodes along layerlines
 * 
 * This is the core function that implements edge-to-edge spacing logic.
 * 
 * @param {Object} params
 * @param {number} params.yarnSizeLevel - Yarn size level (1-9, default 4)
 * @param {string} params.stitchType - Stitch type key (e.g., 'sc', 'hdc', 'dc')
 * @param {number} params.tightenFactor - Optional tightening factor (default 0.9)
 * @param {number} params.edgeGapRatio - Optional edge gap ratio (default 0.2)
 * 
 * @returns {Object} { centerSpacing, visualWidth, edgeGap, baseDims, profile }
 */
export function computeTargetSpacing({
  yarnSizeLevel = 4,
  stitchType = 'sc',
  tightenFactor = 0.9,
  edgeGapRatio = null,
}) {
  // Get base dimensions from yarn size level
  const baseDims = computeStitchDimensions({
    sizeLevel: yarnSizeLevel,
    baseWidth: 1,
    baseHeight: 1,
  })

  // Get stitch profile
  const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc

  // Get visual width multiplier
  const widthMul = profile.widthMul ?? 1.0

  // Calculate visual node width (what the user sees)
  const visualWidth = baseDims.width * widthMul

  // Determine edge-to-edge gap
  // Priority: stitch type's edgeGapMul > function parameter > default constant
  const effectiveGapRatio = profile.edgeGapMul ?? edgeGapRatio ?? DEFAULT_EDGE_GAP_RATIO

  // Calculate absolute edge gap in world units
  const edgeGap = baseDims.width * effectiveGapRatio

  // CORE FORMULA: Center spacing = edge gap + visual width
  // This ensures edge-to-edge spacing remains constant regardless of widthMul
  const rawCenterSpacing = edgeGap + visualWidth

  // Apply tighten factor (optional compression for denser packing)
  const centerSpacing = rawCenterSpacing * tightenFactor

  return {
    centerSpacing,      // Target center-to-center spacing for node distribution
    visualWidth,        // Visual width of nodes (for rendering)
    edgeGap,           // Gap between node edges
    baseDims,          // Base dimensions from yarn size
    profile,           // Stitch type profile
    effectiveGapRatio, // Actual gap ratio used
  }
}

/**
 * Compute target spacing for scaffold planning
 * 
 * This is a specialized version for scaffold chain planning that includes
 * a packing factor for tighter scaffold line placement.
 * 
 * @param {Object} params
 * @param {number} params.yarnSizeLevel - Yarn size level
 * @param {string} params.stitchType - Stitch type key
 * @param {number} params.packingFactor - Packing factor (default 0.9)
 * @param {number} params.edgeGapRatio - Edge gap ratio
 * 
 * @returns {number} Target spacing for scaffold planning
 */
export function computeScaffoldSpacing({
  yarnSizeLevel = 4,
  stitchType = 'sc',
  packingFactor = 0.9,
  edgeGapRatio = null,
}) {
  const { centerSpacing } = computeTargetSpacing({
    yarnSizeLevel,
    stitchType,
    tightenFactor: packingFactor,
    edgeGapRatio,
  })

  return centerSpacing
}

/**
 * Helper function to compute spacing from settings object
 * 
 * This is a convenience wrapper for use in stores and components
 * that have a settings object.
 * 
 * @param {Object} settings - Settings object from store
 * @returns {Object} Spacing calculation result
 */
export function computeSpacingFromSettings(settings) {
  const yarnSizeLevel = Number(settings?.yarnSizeLevel) || 4
  const stitchType = settings?.magicRingStitchType || 'sc'
  const tightenFactor = Number(settings?.tightenFactor) || 0.9

  return computeTargetSpacing({
    yarnSizeLevel,
    stitchType,
    tightenFactor,
  })
}

/**
 * Validate that edge-to-edge spacing is maintained
 * 
 * This is a debugging/testing utility to verify that spacing logic is working correctly.
 * 
 * @param {Object} params
 * @param {number} params.centerSpacing - Actual center-to-center spacing
 * @param {number} params.visualWidth - Visual width of nodes
 * @param {number} params.expectedEdgeGap - Expected edge gap
 * @param {number} params.tolerance - Tolerance for floating point comparison
 * 
 * @returns {Object} { isValid, actualEdgeGap, error }
 */
export function validateEdgeSpacing({
  centerSpacing,
  visualWidth,
  expectedEdgeGap,
  tolerance = 1e-6,
}) {
  // Calculate actual edge gap from center spacing and visual width
  const actualEdgeGap = centerSpacing - visualWidth

  // Check if actual matches expected within tolerance
  const error = Math.abs(actualEdgeGap - expectedEdgeGap)
  const isValid = error < tolerance

  return {
    isValid,
    actualEdgeGap,
    expectedEdgeGap,
    error,
  }
}

/**
 * Example usage and test cases
 * 
 * Uncomment this section to run tests in development:
 * 
 * // Test 1: Verify edge spacing remains constant when widthMul changes
 * const test1a = computeTargetSpacing({ yarnSizeLevel: 4, stitchType: 'sc' }) // widthMul: 1.0
 * const test1b = computeTargetSpacing({ yarnSizeLevel: 4, stitchType: 'hdc' }) // widthMul: 1.0
 * 
 * console.log('Test 1a (SC):', test1a)
 * console.log('Test 1b (HDC):', test1b)
 * 
 * // Test 2: Verify formula correctness
 * const test2 = computeTargetSpacing({ yarnSizeLevel: 4, stitchType: 'sc', tightenFactor: 1.0 })
 * const validation = validateEdgeSpacing({
 *   centerSpacing: test2.centerSpacing,
 *   visualWidth: test2.visualWidth,
 *   expectedEdgeGap: test2.edgeGap,
 * })
 * console.log('Test 2 validation:', validation)
 */

