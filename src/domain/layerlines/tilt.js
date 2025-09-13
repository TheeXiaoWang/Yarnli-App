import { polylineLengthProjected } from './circumference'

/**
 * Compute the projected circumference of a ring/layer.
 * Prefers a planner-provided polyline (more accurate on tilted shapes),
 * otherwise falls back to radius → 2πr.
 */
export function computeRingCircumference(nodeRing) {
  if (!nodeRing || !nodeRing.meta) return 0

  const poly = nodeRing.meta.layerPolyline
  if (Array.isArray(poly) && poly.length > 2) {
    const center = nodeRing.meta.center || nodeRing.meta.surfaceCenter || [0, 0, 0]
    const axis = nodeRing.meta.normal || [0, 1, 0]
    return polylineLengthProjected(poly, center, axis, true)
  }

  const r = Number(nodeRing.meta.radius) || 0
  return r > 0 ? 2 * Math.PI * r : 0
}

/**
 * Return an equator/maximum circumference used as the 0-tilt reference.
 * Resolution order:
 *  - explicit hint.equatorCircumference
 *  - nodeRing.meta.maxCircumference
 *  - nodeRing.meta.maxRadius / equatorRadius → 2πR
 *  - fall back to current ring circumference
 */
export function getEquatorCircumference(nodeRing, hint) {
  if (hint && hint.equatorCircumference) return hint.equatorCircumference
  if (nodeRing?.meta?.maxCircumference) return nodeRing.meta.maxCircumference

  const eqR = nodeRing?.meta?.maxRadius ?? nodeRing?.meta?.equatorRadius
  if (typeof eqR === 'number' && eqR > 0) return 2 * Math.PI * eqR

  // Fallback: use current ring circumference
  return computeRingCircumference(nodeRing)
}

/**
 * Compute the tilt angle (radians) for a ring: 0 at equator, up to 90° near poles.
 * Uses the ratio of current circumference to equator circumference.
 */
export function computeLayerTiltAngle(nodeRing, hint) {
  const cur = computeRingCircumference(nodeRing)
  const eq = getEquatorCircumference(nodeRing, hint)
  if (eq <= 1e-9) return 0
  const ratio = Math.max(0, Math.min(1, cur / eq))
  return (1 - ratio) * (Math.PI / 2)
}



