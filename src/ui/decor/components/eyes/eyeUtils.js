import * as THREE from 'three';

/**
 * Build orientation:
 *  - local Y = outward surface normal
 *  - local Z = axisDir projected onto the tangent plane
 *  - local X = Y x Z
 * Then apply local rotations:
 *  - rotate around local X by +π/2 (constant)
 *  - rotate around local Z by φ, where φ ∈ [0..π] (0 at top, π/2 equator, π bottom)
 */
export function makeEyeQuaternion(normal, axisDir, position, ringTangent = null) {
    const Y = new THREE.Vector3(...(Array.isArray(normal) ? normal : [0, 1, 0])).normalize();
    const A = new THREE.Vector3(...(Array.isArray(axisDir) ? axisDir : [0, 1, 0])).normalize();
  
    let Z;
  
    if (ringTangent && Array.isArray(ringTangent)) {
      // ✅ Use the supplied tangent directly
      Z = new THREE.Vector3(...ringTangent).normalize();
    } else {
      // ✅ Fallback: project world X into the tangent plane of this layer
      let ref = new THREE.Vector3(1, 0, 0);
      if (Math.abs(ref.dot(Y)) > 0.9) {
        ref = new THREE.Vector3(0, 0, 1);
      }
      Z = ref.clone().sub(Y.clone().multiplyScalar(ref.dot(Y))).normalize();
    }
  
    // Make sure Z is consistent relative to axisDir
    if (Z.dot(A) < 0) {
      Z.negate();
    }
  
    // X = Y × Z
    const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  
    // Base frame
    const base = new THREE.Matrix4().makeBasis(X, Y, Z);
    let q = new THREE.Quaternion().setFromRotationMatrix(base);
  
    // Tilt dome forward
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    q.multiply(qx);
  
    return q;
  }
  


export function calculateEyePosition(position, normal, radius = 0.12) {
  const pos = Array.isArray(position) ? position : [0, 0, 0];
  const N = new THREE.Vector3(...(Array.isArray(normal) ? normal : [0, 1, 0])).normalize();
  const offset = Math.max(0.001, radius * 0.02);
  return [pos[0] + N.x * offset, pos[1] + N.y * offset, pos[2] + N.z * offset];
}