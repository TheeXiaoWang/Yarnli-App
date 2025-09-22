import * as THREE from 'three'
import { MODEL_TO_CANON_Q } from '../../constants/orientation'

export function buildNodeQuaternion(p, prev, next, centerV, up, tiltRad, latitude = null, yNorm = null) {
  // Tangent
  const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
  // Outward normal
  const pn = new THREE.Vector3(p[0], p[1], p[2])
  const nrm = pn.clone().sub(centerV).normalize()

  // Basis
  const X = t.clone()
  const Z = nrm.clone()
  let Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  Z.copy(new THREE.Vector3().crossVectors(X, Y)).normalize()

  const basis = new THREE.Matrix4().makeBasis(X, Y, Z)
  const qBase = new THREE.Quaternion().setFromRotationMatrix(basis)

  // Canonical correction first
  qBase.multiply(MODEL_TO_CANON_Q)

  // Roll around the node's LOCAL X expressed in world space:
  // pre-multiply by rotation about Xworld to achieve local-X roll
  const Xworld = new THREE.Vector3(1, 0, 0).applyQuaternion(qBase).normalize()
  // Apply the provided roll angle directly (already mapped by caller)
  // Apply the provided roll directly; caller is responsible for sign
  const qRollWorldX = new THREE.Quaternion().setFromAxisAngle(Xworld, tiltRad)
  const qFinal = qRollWorldX.multiply(qBase)

  return qFinal
}


