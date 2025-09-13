import * as THREE from 'three'
import { MODEL_TO_CANON_Q } from '../../../constants/orientation'

/**
 * Build final orientation quaternion for a stitch node.
 * Canonical mapping: model (X=width, Y=height, Z=outward)
 * → world (X=tangent, Y=binormal, Z=normal).
 *
 * @param {THREE.Vector3} tangentX - world-space tangent (tip-to-tip direction)
 * @param {THREE.Vector3} radialZ - world-space outward normal
 * @param {number} layerTheta - optional additional roll around local X
 * @returns {THREE.Quaternion}
 */
export function getQuaternionFromTN(tangentX, radialZ, layerTheta = 0) {
  const X = (tangentX?.clone?.() ?? new THREE.Vector3(1, 0, 0)).normalize()
  const Z = (radialZ?.clone?.() ?? new THREE.Vector3(0, 0, 1)).normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  Z.copy(new THREE.Vector3().crossVectors(X, Y)).normalize()

  const basis = new THREE.Matrix4().makeBasis(X, Y, Z)
  const q = new THREE.Quaternion().setFromRotationMatrix(basis)

  // 1) model → canonical correction (if needed)
  q.multiply(MODEL_TO_CANON_Q)

  // 2) optional per-layer tilt about local X
  if (layerTheta !== 0) {
    const roll = new THREE.Quaternion().setFromAxisAngle(X, layerTheta)
    q.multiply(roll)
  }

  return q
}


