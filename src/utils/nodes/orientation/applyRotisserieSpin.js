import * as THREE from 'three'

/**
 * Apply a "rotisserie" spin to align nodes around a primary pole axis.
 *
 * @param {THREE.Quaternion} q - The base quaternion from tangent/normal basis
 * @param {THREE.Vector3} pos - Node world position (preferably normalized)
 * @param {THREE.Vector3} axis - Primary axis (e.g., Y axis for sphere)
 * @returns {THREE.Quaternion} - Adjusted quaternion with spin applied
 */
export function applyRotisserieSpin(q, pos, axis) {
  const axisNorm = (axis?.clone?.() ?? new THREE.Vector3(0, 1, 0)).normalize()

  // Normalize/convert input position
  const P = pos?.isVector3 ? pos : new THREE.Vector3(
    Array.isArray(pos) ? (pos[0] ?? 0) : (pos?.x ?? 0),
    Array.isArray(pos) ? (pos[1] ?? 0) : (pos?.y ?? 0),
    Array.isArray(pos) ? (pos[2] ?? 0) : (pos?.z ?? 0)
  )

  // Project position onto plane perpendicular to axis
  const proj = P.clone().sub(axisNorm.clone().multiplyScalar(P.dot(axisNorm)))
  if (proj.lengthSq() < 1e-12) return q // at the pole; no meaningful azimuth
  proj.normalize()

  // Stable reference in that plane
  const ref = new THREE.Vector3(1, 0, 0)
  if (Math.abs(ref.dot(axisNorm)) > 0.9) ref.set(0, 0, 1)
  const east = new THREE.Vector3().crossVectors(axisNorm, ref).normalize()
  const north = new THREE.Vector3().crossVectors(east, axisNorm).normalize()

  const theta = Math.atan2(proj.dot(east), proj.dot(north))
  try { if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.log('[rotisserie] theta=', Number(theta).toFixed(3)) } catch(_) {}

  // Apply spin AFTER local basis (post-multiply) so it affects the result in the world axis
  const rotisserieQuat = new THREE.Quaternion().setFromAxisAngle(axisNorm, theta)
  const out = (q?.clone?.() ?? new THREE.Quaternion())
  out.multiply(rotisserieQuat)
  return out
}


