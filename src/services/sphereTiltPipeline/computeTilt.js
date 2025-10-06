// src/services/sphereTiltPipeline/computeTilt.js

/**
 * Hybrid pole-to-pole geometric + radius-delta-based tilt calculation.
 *
 * This approach combines two key concepts:
 * 1. **Geometric Pole Anchoring**: Tilt is anchored to the true geometric poles (minT and maxT)
 * 2. **Radius-Delta Rate of Change**: The rate of tilt change follows the sphere's curvature
 *
 * Key Concept:
 * - Start pole (minT) is anchored at 180° tilt
 * - End pole (maxT) is anchored at 0° tilt
 * - The RATE of tilt change between layers is determined by radius deltas
 * - Layers with large radius changes (near poles) get large tilt increments
 * - Layers with small radius changes (near equator) get small tilt increments
 *
 * This creates natural tilt progression that:
 * - Follows the sphere's geometric curvature
 * - Is anchored to the true poles (not layer indices)
 * - Has the equator naturally fall near 90° based on radius distribution
 *
 * @param {number} layerIndex - Current layer index (used to look up position in arrays)
 * @param {number[]} allLayerRadii - Array of radii for all layers [r0, r1, r2, ..., rN]
 * @param {number[]} allLayerAxialPositions - Array of axial positions (t values) for all layers
 * @returns {object} { rollAngle, cumulativeChange, totalChange, ratio, axialPosition }
 */
export function computeTiltFromRadiusDeltas(layerIndex, allLayerRadii, allLayerAxialPositions = []) {
  // Validate inputs
  if (!Array.isArray(allLayerRadii) || allLayerRadii.length === 0) {
    return { rollAngle: Math.PI / 2, cumulativeChange: 0, totalChange: 0, ratio: 0.5 }
  }

  const numLayers = allLayerRadii.length
  const idx = Math.max(0, Math.min(layerIndex, numLayers - 1))

  // Calculate radius deltas for all layer transitions
  const radiusDeltas = []
  for (let i = 1; i < numLayers; i++) {
    const delta = Math.abs(allLayerRadii[i] - allLayerRadii[i - 1])
    radiusDeltas.push(delta)
  }

  // Use SQUARED radius deltas to amplify the curvature effect
  // This makes layers with large radius changes contribute much more to the cumulative sum
  // Example: delta=0.8 → weight=0.64, delta=0.1 → weight=0.01 (64x difference instead of 8x)
  const radiusDeltaWeights = radiusDeltas.map(delta => delta * delta)

  // Calculate total weighted radius change across all layers
  const totalChange = radiusDeltaWeights.reduce((sum, weight) => sum + weight, 0)

  // Calculate cumulative weighted radius change up to current layer
  let cumulativeChange = 0
  for (let i = 0; i < idx && i < radiusDeltaWeights.length; i++) {
    cumulativeChange += radiusDeltaWeights[i]
  }

  // Calculate cumulative ratio (0 at start pole, 1 at end pole)
  // This ratio represents how far along the sphere we are, weighted by SQUARED radius changes
  // This amplifies the effect: layers with large deltas progress the ratio much faster
  const ratio = totalChange > 1e-9 ? cumulativeChange / totalChange : 0

  // Map cumulative weighted ratio to tilt angle
  // The ratio is anchored to the geometric poles (not layer indices)
  // but the rate of change is AMPLIFIED by squaring the radius deltas
  //
  // Start pole (ratio = 0): tilt = 180° → π radians (displayed as 180° after ×2)
  // Equator (ratio ≈ 0.5): tilt ≈ 90° → π/2 radians (displayed as 90° after ×2)
  // End pole (ratio = 1): tilt = 0° → 0 radians (displayed as 0° after ×2)
  //
  // Formula: rollAngle = (1 - ratio) × π/2
  // This inverts the mapping: ratio 0 → π/2, ratio 0.5 → π/4, ratio 1 → 0
  const rollAngle = (1 - ratio) * Math.PI / 2  // π/2 to 0 radians (90° to 0° before ×2, 180° to 0° after ×2 display)

  return {
    rollAngle,
    cumulativeChange,
    totalChange,
    ratio,
    // Include axial position if available (for debugging)
    axialPosition: allLayerAxialPositions?.[idx] ?? null
  }
}

