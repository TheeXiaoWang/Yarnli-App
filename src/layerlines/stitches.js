// Stitch sizing presets and helpers
// - Size levels: 1..9 (4 is normal/base level → scale 1.0)
// - Dimensions are expressed in relative units (you can treat 1 unit as mm or world units)
// - Height base is 1.0 by default; width base is 1.0 by default
// - Stitch-type multipliers:
//   single: height 1.0, width 1.0
//   increase: height 1.5, width 1.5
//   hdc (half-double crochet): height 1.5, width 1.0
//   decrease: height 1.0, width 0.7

export const BASE_SIZE_LEVEL = 4

export const SIZE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function levelToScale(level) {
  const clamped = Math.max(1, Math.min(9, Math.round(level)))
  // Map levels 1..9 to a perceptual scale curve so 1 is much finer, 4 is baseline, 9 is large
  // This uses a quadratic below baseline and linear above to widen dynamic range on the fine end
  // Keep a simple linear mapping to ensure equal yarn sizes produce identical spacing across scales
  return clamped / BASE_SIZE_LEVEL
}

// Stitch type removed; use neutral multipliers
export function getStitchProfile() {
  return { heightMultiplier: 1.0, widthMultiplier: 1.0 }
}

// Compute concrete dimensions for a given size level and stitch kind
// baseWidth/baseHeight let you map to your scene units; default to 1
export function computeStitchDimensions({ sizeLevel = BASE_SIZE_LEVEL, baseWidth = 1, baseHeight = 1 }) {
  const scale = levelToScale(sizeLevel)
  const { heightMultiplier, widthMultiplier } = getStitchProfile()
  return {
    width: baseWidth * scale * widthMultiplier,
    height: baseHeight * scale * heightMultiplier,
  }
}

// Convenience: stitch spacing to use along layerlines
export function stitchSpacing(sizeLevel = BASE_SIZE_LEVEL, baseWidth = 1) {
  return computeStitchDimensions({ sizeLevel, baseWidth }).width
}
