import * as THREE from 'three'

/**
 * Orient a node to follow the layer path.
 * - X axis (short width) aligns to tangent (tip-to-tip).
 * - Y axis (long stitch height) aligns to bitangent = normal × tangent.
 * - Z axis (depth) aligns to outward normal.
 * Basis is orthonormalized implicitly by using normalized inputs and cross products.
 *
 * @param {THREE.Object3D} mesh - The node mesh to orient
 * @param {THREE.Vector3} tangent - Tangent along the layer path (tip-to-tip direction)
 * @param {THREE.Vector3} normal - Outward normal from the object center
 */
export function orientNodeToLayerPath(mesh, tangent, normal, rollAngle = 0) {
  // Build explicit right-handed orthonormal basis using tangent and radial normal
  const x = (tangent?.clone?.() ?? new THREE.Vector3(1, 0, 0)).normalize()
  const z = (normal?.clone?.() ?? new THREE.Vector3(0, 0, 1)).normalize()
  let y = new THREE.Vector3().crossVectors(z, x)
  if (y.lengthSq() < 1e-12) {
    // Fallback to a stable axis when inputs are nearly colinear
    const arbitrary = Math.abs(z.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    y = new THREE.Vector3().crossVectors(z, arbitrary)
  }
  y.normalize()
  z.crossVectors(x, y).normalize()

  const basis = new THREE.Matrix4().makeBasis(x, y, z)
  let q = new THREE.Quaternion().setFromRotationMatrix(basis)

  // Optional roll around local X (tangent) for controlled lateral tilt
  if (rollAngle && Math.abs(rollAngle) > 1e-12) {
    const roll = new THREE.Quaternion().setFromAxisAngle(x, rollAngle)
    q.multiply(roll)
  }

  if (mesh && typeof mesh.setRotationFromQuaternion === 'function') mesh.setRotationFromQuaternion(q)
  return q
}


