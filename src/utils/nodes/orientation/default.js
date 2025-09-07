import * as THREE from 'three'

/**
 * Calculate default node orientation (for non-sphere shapes)
 * @param {THREE.Vector3} position - Node position
 * @param {THREE.Vector3} depthAxis - Surface normal (outward from surface)
 * @param {THREE.Vector3} widthAxis - Ring tangent direction
 * @param {Object} meta - Node ring metadata (unused for default)
 * @returns {THREE.Quaternion} - Orientation quaternion for the node
 */
export function calculateDefaultOrientation(position, depthAxis, widthAxis, meta) {
  // Default: X=tangent, Y=surface normal, Z=secondary tangent (original behavior)
  const yAxis = depthAxis.clone().normalize()
  const zAxis = new THREE.Vector3().crossVectors(widthAxis, yAxis).normalize()
  const basis = new THREE.Matrix4().makeBasis(widthAxis, yAxis, zAxis)
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}
