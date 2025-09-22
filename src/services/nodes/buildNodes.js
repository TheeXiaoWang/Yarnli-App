import * as THREE from 'three'
import { computeRingRollAngleFromCenter } from '../nodeOrientation/computeTilt'
import { buildNodeQuaternion } from '../nodeOrientation/buildNodeQuaternion'
import { STITCH_TYPES } from '../../constants/stitchTypes'

// Track state across rings to flip sign only AFTER the first near-zero tilt ring
let __lastBaseRollMagnitude = null
let __hitZeroTilt = false

// Ensure first ring sign is positive when starting a new scaffold step
export function resetTiltTrend() {
  __lastBaseRollMagnitude = null
  __hitZeroTilt = false
}

export const buildNodes = (evenPts, ringCenter, sphereCenter, up, rNext, overrideRollAngle = null, hemisphereSign = null, stitchType = 'sc') => {
  const ringCenterV = new THREE.Vector3(ringCenter[0], ringCenter[1], ringCenter[2])
  const sphereCenterV = new THREE.Vector3(sphereCenter[0], sphereCenter[1], sphereCenter[2])
  const upV = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()
  const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  const baseRoll = (overrideRollAngle != null ? overrideRollAngle : computed.rollAngle)
  const { latitude, yNorm } = computed
  // Simple rule: flip sign only AFTER the first ring with near-zero |tilt|
  // Keep the zero-tilt ring itself positive.
  const ZERO_EPS = 1e-3 // radians (~0.057°)
  const absRoll = Math.abs(baseRoll)
  const prevHitZero = __hitZeroTilt
  const hitsZeroNow = absRoll <= ZERO_EPS
  // First ring positive; after we've ALREADY seen a zero ring, force negative
  const finalSign = (__lastBaseRollMagnitude == null) ? 1 : (prevHitZero ? -1 : 1)
  __hitZeroTilt = prevHitZero || hitsZeroNow
  __lastBaseRollMagnitude = baseRoll

  // Per-ring tilt log (dev only)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      const baseDeg = THREE.MathUtils.radToDeg(baseRoll)
      const signedDeg = THREE.MathUtils.radToDeg(finalSign * baseRoll)
      console.log(`[Tilt] ringBaseRoll=${baseDeg.toFixed(2)}° signed=${signedDeg.toFixed(2)}° (hemi)`) 
    }
  } catch (_) {}

  const nEven = Math.max(1, evenPts.length)
  
  // Get stitch type properties
  const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
  
  // Ensure stitchProfile exists
  if (!stitchProfile) {
    console.error('Invalid stitch type in buildNodes:', stitchType, 'Available types:', Object.keys(STITCH_TYPES))
    return evenPts.map((e, i) => ({
      id: (i + 1) % evenPts.length,
      p: e.p || e,
      theta: 0,
      quaternion: [0, 0, 0, 1],
      stitchType: 'sc',
      stitchProfile: STITCH_TYPES.sc,
    }))
  }
  
  return evenPts.map((e, i) => {
    const prevEntry = evenPts[(i - 1 + nEven) % nEven]
    const nextEntry = evenPts[(i + 1) % nEven]
    const prev = prevEntry.p || prevEntry
    const next = nextEntry.p || nextEntry
    const p = e.p || e
    const signedRoll = finalSign * baseRoll
    const q = buildNodeQuaternion(p, prev, next, ringCenterV, upV, signedRoll, latitude, yNorm)

    return {
      id: (i + 1) % nEven,
      p,
      theta: signedRoll,
      quaternion: [q.x, q.y, q.z, q.w],
      stitchType: stitchType,
      stitchProfile: stitchProfile,
    }
  })
}


