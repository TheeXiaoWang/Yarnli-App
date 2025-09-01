import { computeStitchDimensions } from '../../layerlines/stitches'
import { STITCH_TYPES } from '../../constants/stitchTypes'

// Compute effective stitch width/height/depth given settings
// Returns { width, height, depth, profile }
export function computeStitchGaugeFromSettings(settings) {
  const stitchTypeKey = settings?.magicRingStitchType || 'mr'
  const profile = STITCH_TYPES[stitchTypeKey] || STITCH_TYPES.mr
  const sizeLevel = Number(settings?.yarnSizeLevel) || 4
  const baseDims = computeStitchDimensions({ sizeLevel, baseWidth: 1, baseHeight: 1 })
  const widthMul = profile.widthMul ?? ((profile.width ?? 0.5) / 0.5)
  const heightMul = profile.heightMul ?? ((profile.height ?? 0.5) / 0.5)
  const depthMul = profile.depthMul ?? ((profile.depth ?? 0.75) / 0.75)
  return {
    width: baseDims.width * widthMul,
    height: baseDims.height * heightMul,
    depth: baseDims.width * depthMul,
    profile,
  }
}


