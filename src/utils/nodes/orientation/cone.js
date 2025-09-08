import * as THREE from 'three'

/**
 * Calculate cone-specific node orientation
 * @param {THREE.Vector3} position - Node position
 * @param {THREE.Vector3} depthAxis - Surface normal (outward from surface)
 * @param {THREE.Vector3} widthAxis - Ring tangent direction
 * @param {Object} meta - Node ring metadata containing axisDir, axisOrigin, axisLen
 * @returns {THREE.Quaternion} - Orientation quaternion for the node
 */
export function calculateConeOrientation(position, depthAxis, widthAxis, meta) {
  // Cone: Keep width along ring tangent. Height points uniformly "up-slope"
  // along the cone (projection of the cone axis into the local ring plane).
  const normalAxis = depthAxis.clone().normalize()
  const xAxis = widthAxis.clone().normalize() // ALWAYS keep width along ring tangent
  if (xAxis.lengthSq() < 1e-12) xAxis.set(1, 0, 0)

  let yAxis = normalAxis.clone()
  try {
    const nArr = meta?.axisDir
    if (Array.isArray(nArr) && nArr.length === 3) {
      const axisDir = new THREE.Vector3(nArr[0], nArr[1], nArr[2]).normalize()
      // Project axisDir onto the local ring plane (perpendicular to normalAxis)
      const meridianWorld = axisDir.sub(normalAxis.clone().multiplyScalar(axisDir.dot(normalAxis)))
      if (meridianWorld.lengthSq() > 1e-12) yAxis = meridianWorld.normalize()
    }
  } catch (_) { /* keep fallback normal */ }

  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}
