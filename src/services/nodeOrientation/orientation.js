import * as THREE from 'three'
import { MODEL_TO_CANON_Q } from '../../constants/orientation'
import { clamp, reOrthonormalize } from './orientationUtils'

export const computeLayerTilt = (yNext, centerV, radius, up) => {
  const R = Math.max(1e-9, Number(radius) || 0)
  // Axis-projected latitude
  const axis = up?.isVector3 ? up.clone().normalize() : new THREE.Vector3(up[0], up[1], up[2]).normalize()
  const sample = centerV.clone().add(axis.clone().multiplyScalar(yNext))
  const yNorm = clamp(sample.clone().sub(centerV).dot(axis) / R)
  // Latitude in radians: asin(yNorm). Tilt = |latitude|
  return Math.abs(Math.asin(yNorm))
}

export const buildNodeQuaternion = (p, prev, next, centerV, tiltRad) => {
  const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
  const pn = new THREE.Vector3(p[0], p[1], p[2])
  const nrm = pn.clone().sub(centerV).normalize()
  const { x: X, y: Y, z: Z } = reOrthonormalize(t, new THREE.Vector3(), nrm)
  const basis = new THREE.Matrix4().makeBasis(X, Y, Z)
  const q = new THREE.Quaternion().setFromRotationMatrix(basis)
  q.multiply(MODEL_TO_CANON_Q)
  // Uniform per-layer roll in LOCAL X (width)
  const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
  q.multiply(qRoll)
  return q
}

export const orientNodesOnLayer = (evenPts, centerV, up, yNext, rNext) => {
  const tilt = computeLayerTilt(yNext, centerV, rNext, up)
  const nEven = Math.max(1, evenPts.length)
  return evenPts.map((e, i) => {
    // neighbors with wrap for closed sampling; caller should pass appropriate neighbors
    const prevIdx = (i - 1 + nEven) % nEven
    const nextIdx = (i + 1) % nEven
    const prev = evenPts[prevIdx]
    const next = evenPts[nextIdx]
    const q = buildNodeQuaternion(e.p || e, evenPts[prevIdx].p || prev, evenPts[nextIdx].p || next, centerV, tilt)
    return {
      id: (i + 1) % nEven,
      p: e.p || e,
      tangent: [q.x, q.y, q.z], // optional: caller can overwrite with explicit tangent
      normal: [],
      theta: tilt,
      quaternion: [q.x, q.y, q.z, q.w],
    }
  })
}


