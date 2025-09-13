// Pure function to compute a quaternion from tangent and normal vectors
import * as THREE from 'three'

export function getQuaternionFromTN(tangent, normal) {
  if (!tangent || !normal) return [0, 0, 0, 1]
  
  // Ensure vectors are normalized
  const t = new THREE.Vector3(...tangent).normalize()
  const n = new THREE.Vector3(...normal).normalize()
  
  // Calculate bitangent
  const b = new THREE.Vector3().crossVectors(n, t).normalize()
  
  // Create rotation matrix from orthonormal basis
  const matrix = new THREE.Matrix4().makeBasis(t, b, n)
  
  // Extract quaternion
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix)
  
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}
