import { computeStitchDimensions } from '../../../../domain/layerlines/stitches'
import { STITCH_TYPES } from '../../../../constants/stitchTypes'

/**
 * Calculate the depth of nodes based on current yarn size and stitch type
 * This matches the calculation used in NodeViewer.jsx
 */
export function calculateNodeDepth(settings) {
  const yarnLevel = Number(settings?.yarnSizeLevel) || 4
  const stitchType = settings?.magicRingStitchType || 'sc'
  
  // Get base dimensions from yarn size
  const baseDims = computeStitchDimensions({ 
    sizeLevel: yarnLevel, 
    baseWidth: 1, 
    baseHeight: 1 
  })
  
  // Get stitch profile (same as NodeViewer)
  const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
  
  if (!profile || typeof profile.depthMul === 'undefined') {
    // Fallback for invalid profiles
    return baseDims.width * 0.5 * 0.5 // Default depth calculation
  }
  
  // Calculate scaled depth (matches NodeViewer calculation)
  const scaledDepth = baseDims.width * (profile.depthMul ?? 0.5)
  const scaleDepth = Math.max(0.0025, scaledDepth * 0.5)
  
  return scaleDepth
}

/**
 * Calculate yarn curve offset based on node depth
 * The yarn should bend outward by half the node depth plus clearance
 */
export function calculateYarnBendOffset(nodeDepth, yarnRadius) {
  // Half node depth + clearance for the yarn itself
  return (nodeDepth * 0.5) + (yarnRadius * 2)
}
