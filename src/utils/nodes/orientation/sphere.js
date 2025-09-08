import * as THREE from 'three'

/**
 * Calculate sphere-specific node orientation
 * @param {THREE.Vector3} position - Node position
 * @param {THREE.Vector3} depthAxis - Surface normal (outward from surface)
 * @param {THREE.Vector3} widthAxis - Ring tangent direction
 * @param {Object} meta - Node ring metadata containing axisDir, axisOrigin, axisLen
 * @returns {THREE.Quaternion} - Orientation quaternion for the node
 */
export function calculateSphereOrientation(position, depthAxis, widthAxis, meta) {
  // Sphere: ALWAYS keep width locked to the layer line direction (ring tangent)
  const normalAxis = depthAxis.clone().normalize()
  
  // Ensure width axis is properly normalized and orthogonal to surface normal
  let xAxis = widthAxis.clone()
  // Remove any component along the surface normal to ensure it's truly tangent to the surface
  xAxis = xAxis.sub(normalAxis.clone().multiplyScalar(xAxis.dot(normalAxis))).normalize()
  if (xAxis.lengthSq() < 1e-12) xAxis.set(1, 0, 0)
  
  let yAxis = normalAxis.clone() // start with surface normal (outward)
  let zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
  
  // Progressive blend: near start pole = normal orientation, near end pole = meridian orientation
  try {
    const nArr = meta?.axisDir
    const oArr = meta?.axisOrigin
    const len = Number(meta?.axisLen) || 0
    if (Array.isArray(nArr) && nArr.length === 3 && Array.isArray(oArr) && oArr.length === 3 && len > 1e-9) {
      const n = new THREE.Vector3(nArr[0], nArr[1], nArr[2]).normalize()
      const O = new THREE.Vector3(oArr[0], oArr[1], oArr[2])
      const s = Math.max(0, Math.min(1, n.dot(position.clone().sub(O)) / len))
      // Progress from start pole (s=0) toward end pole (s=1)
      const blendFactor = s // 0 at start pole = pure normal, 1 at end pole = pure meridian
      
      if (blendFactor > 1e-6) {
        // Calculate meridian direction in local space (perpendicular to both normal and width)
        const meridianWorld = n.clone().sub(normalAxis.clone().multiplyScalar(n.dot(normalAxis)))
        if (meridianWorld.lengthSq() > 1e-12) {
          const meridianLocal = meridianWorld.normalize()
          // Blend height axis from normal toward meridian, keeping width fixed
          const blendedHeight = normalAxis.clone().multiplyScalar(1 - blendFactor).add(meridianLocal.multiplyScalar(blendFactor))
          if (blendedHeight.lengthSq() > 1e-12) {
            yAxis = blendedHeight.normalize()
            zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
          }
        }
      }
    }
  } catch(_) {
    // Fallback to normal orientation if calculation fails
  }
  
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}
