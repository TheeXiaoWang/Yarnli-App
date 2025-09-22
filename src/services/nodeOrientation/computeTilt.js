// src/services/nodeOrientation/computeTiltFromCenter.js
import * as THREE from 'three'

/**
 * Symmetric layer tilt (0° at both poles, 90° at equator).
 * ringCenterV: center of this ring (point on axis in the ring's plane)
 * sphereCenterV: center of the sphere (object center)
 * radius: sphere radius
 * up: sphere axis (any direction, will be normalized)
 */
export function computeRingRollAngleFromCenter(
  ringCenterV,
  sphereCenterV,
  ringRadius,
  up,
  layerIndex = null
) {
  const axis = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()
  const d = ringCenterV.clone().sub(sphereCenterV)
  const t = Math.abs(d.dot(axis)) // axial offset from sphere center
  const r = Math.max(1e-9, Number(ringRadius) || 0) // ring radius about axis
  const Rest = Math.sqrt(t * t + r * r)
  // Axis-relative normalized latitude in [-1,1]
  const yNorm = THREE.MathUtils.clamp(t / Rest, -1, 1)

  // latitude: 0 at north pole, π/2 at equator, π at south pole
  const latitude = Math.acos(yNorm)

  // Signed roll around local X we actually want to apply to nodes:
  // roll = + (π/2 − latitude) in north, roll = − (π/2 − latitude) in south
  const rollAngle = ((Math.PI / 2) - latitude)

  // Debug removed to avoid confusion; callers may log the effective roll used

  return { rollAngle, latitude, yNorm }
}

export function computeRollFromCircumference(currentCircumference, maxCircumference) {
  const maxC = Math.max(1e-9, Number(maxCircumference) || 0)
  const curC = Math.max(0, Number(currentCircumference) || 0)
  const t = Math.max(0, Math.min(1, curC / maxC))
  // Inverted mapping: equator (max circumference) -> 0°, poles (small circumference) -> 90°
  return (1 - t) * (Math.PI / 2)
}

// Back-compat export (deprecated): returns an object for older callers
export const computeLayerTiltFromCenter = (
  ringCenterV,
  sphereCenterV,
  radius,
  up,
  layerIndex = null
) => computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, radius, up, layerIndex)
