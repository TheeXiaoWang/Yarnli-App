import * as THREE from 'three'

/**
 * Compute the Magic Ring stitch count (MR-Count) from a minimal set of inputs.
 *
 * Rules:
 * - Build conceptually on the MR plane from startCenter; no node placement, no layer mutation.
 * - Circumference target C0 ≈ 2π·r0 with r0 from getRadiusAtY(yStart) or small epsilon if zero.
 * - Singles that fit: S0 = round(C0 / stitchGauge.width), clamped S0 ≥ 3.
 * - Deterministic for same inputs.
 *
 * @param {Object} params
 * @param {number[]} params.layerYs - Read-only list of layer Y keys (monotonic along slicing dir)
 * @param {(y:number)=>number} params.getRadiusAtY - Read-only radius sampler at given Y
 * @param {THREE.Vector3} params.startCenter - World-space start pole center on the MR plane
 * @param {THREE.Vector3} params.ringPlaneNormal - World-space MR plane normal
 * @param {{ width: number }} params.stitchGauge - Arc width per single stitch
 * @param {{ inc?: number, dec?: number }} [params.factors] - Reserved for future tuning
 * @param {'right'|'left'} [params.handedness] - Reserved for ordering; no effect here
 * @returns {{ magicRing: { stitchCount: number, plane: { center: number[], normal: number[] } } }}
 */
export function computeMagicRingCount({
  layerYs,
  getRadiusAtY,
  startCenter,
  ringPlaneNormal,
  stitchGauge,
  factors, // eslint-disable-line no-unused-vars
  handedness, // eslint-disable-line no-unused-vars
}) {
  // Determine starting Y: prefer the first provided key; else 0 as a stable fallback
  const yStart = Array.isArray(layerYs) && layerYs.length > 0 ? layerYs[0] : 0

  // Sample initial radius; if zero/invalid, use a tiny epsilon to avoid 0 circumference
  let r0 = 0
  try {
    const sampled = typeof getRadiusAtY === 'function' ? getRadiusAtY(yStart) : 0
    r0 = Number.isFinite(sampled) ? Math.max(0, sampled) : 0
  } catch (_) {
    r0 = 0
  }
  if (!(r0 > 0)) r0 = 1e-6

  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  const C0 = 2 * Math.PI * r0
  const S0 = Math.round(C0 / gaugeW)
  const stitchCount = Math.max(3, S0)

  // Plane: return normalized normal and center as arrays (no mutation)
  const n = new THREE.Vector3(
    Number(ringPlaneNormal?.x) || 0,
    Number(ringPlaneNormal?.y) || 1,
    Number(ringPlaneNormal?.z) || 0
  )
  if (n.lengthSq() < 1e-12) n.set(0, 1, 0)
  n.normalize()

  const c = new THREE.Vector3(
    Number(startCenter?.x) || 0,
    Number(startCenter?.y) || 0,
    Number(startCenter?.z) || 0
  )

  return {
    magicRing: {
      stitchCount,
      plane: { center: [c.x, c.y, c.z], normal: [n.x, n.y, n.z] },
    },
  }
}

