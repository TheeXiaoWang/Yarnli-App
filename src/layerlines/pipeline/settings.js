import { computeStitchDimensions } from '../stitches'

// Build an effective settings object so downstream code can rely on normalized values
export function normalizeSettings(input) {
  const settings = input || {}
  const { width: derivedSpacing, height: derivedHeight } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseWidth: 1,
    baseHeight: 1,
  })
  return {
    ...settings,
    stitchSize: derivedSpacing || settings.stitchSize,
    layerHeight: derivedHeight || settings.layerHeight,
    lineSpacing: derivedSpacing || settings.lineSpacing,
  }
}


