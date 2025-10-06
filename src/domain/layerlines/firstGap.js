import * as THREE from 'three'
import { computeStitchDimensions } from './stitches'
import { STITCH_TYPES } from '../../constants/stitchTypes'

// Compute desired first-ring circumference for N edge stitches
// Uses magicRingDefaultStitches setting if available, otherwise defaults to 5
export function desiredFirstCircumference(settings) {
  const gauge = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4, baseWidth: 1, baseHeight: 1 })
  const edge = STITCH_TYPES.edge || STITCH_TYPES.sc
  const widthMul = edge.widthMul ?? ((edge.width ?? 0.5) / 0.5)
  const PACKING = 0.9
  const spacing = gauge.width * widthMul * PACKING

  // Use magicRingDefaultStitches setting if available, otherwise default to 5
  const stitchCount = Number.isFinite(settings?.magicRingDefaultStitches)
    ? Math.max(3, Math.round(settings.magicRingDefaultStitches))
    : 5

  console.log('[FirstGap] Calculating desired circumference:', {
    'magicRingDefaultStitches': settings?.magicRingDefaultStitches,
    'stitchCount': stitchCount,
    'spacing': spacing.toFixed(4),
    'circumference': (stitchCount * spacing).toFixed(4),
  })

  return Math.max(1e-6, stitchCount * spacing)
}

// Generic binary search helper: find smallest gap d in [0, hi]
// such that perimeterAt(d) >= targetCircumference
export function solveFirstGap({ targetCircumference, upperBound, perimeterAt, iterations = 40 }) {
  let lo = 0
  let hi = Math.max(1e-6, upperBound)
  for (let i = 0; i < iterations; i++) {
    const d = 0.5 * (lo + hi)
    const p = Number(perimeterAt(d)) || 0
    if (p >= targetCircumference) hi = d; else lo = d
  }
  return hi
}

// Convenience for cones: perimeter of ellipse grown linearly with distance along axis
export function conePerimeterAtDistanceFactory({ matrix, dir }) {
  // projected world axes in ring plane
  const axisLen = new THREE.Vector3().setFromMatrixColumn(matrix, 1).length()
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const project = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = project(c0w).length()
  const bW = project(c2w).length()
  const perimeterEllipse = (a, b) => Math.PI * (3 * (a + b) - Math.sqrt(Math.max((3 * a + b) * (a + 3 * b), 0)))
  return (dWorld) => {
    const rLocal = (dWorld / Math.max(axisLen, 1e-9)) / 2
    const a = rLocal * aW
    const b = rLocal * bW
    return perimeterEllipse(a, b)
  }
}

// Convenience for cylinders: perimeter of constant-radius circle
export function cylinderPerimeterAtDistanceFactory({ matrix, dir }) {
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const project = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = project(c0w).length()
  const bW = project(c2w).length()
  const radius = Math.max(aW, bW)
  return (dWorld) => 2 * Math.PI * radius
}

// Convenience for capsules: perimeter varies with height (hemispheres + cylinder)
export function capsulePerimeterAtDistanceFactory({ matrix, dir }) {
  const axisLen = new THREE.Vector3().setFromMatrixColumn(matrix, 1).length()
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const project = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = project(c0w).length()
  const bW = project(c2w).length()
  const radius = Math.max(aW, bW)
  return (dWorld) => {
    const tLocal = dWorld / Math.max(axisLen, 1e-9)
    let radiusLocal = 0.5 // Base radius for capsule
    
    // Adjust radius based on position along the capsule
    if (tLocal < 0.5) {
      // Bottom hemisphere
      const hemisphereT = tLocal * 2 // 0 to 1
      radiusLocal = 0.5 * Math.sin(hemisphereT * Math.PI / 2)
    } else if (tLocal > 1.5) {
      // Top hemisphere
      const hemisphereT = (tLocal - 1.5) * 2 // 0 to 1
      radiusLocal = 0.5 * Math.sin(hemisphereT * Math.PI / 2)
    }
    // Middle section (tLocal 0.5 to 1.5) keeps constant radius 0.5
    
    return 2 * Math.PI * radiusLocal * radius
  }
}

// Convenience for pyramids: perimeter grows linearly from apex to base
export function pyramidPerimeterAtDistanceFactory({ matrix, dir }) {
  const axisLen = new THREE.Vector3().setFromMatrixColumn(matrix, 1).length()
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const project = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = project(c0w).length()
  const bW = project(c2w).length()
  const radius = Math.max(aW, bW)
  return (dWorld) => {
    const tLocal = dWorld / Math.max(axisLen, 1e-9)
    const radiusLocal = tLocal / 2 // Linear increase from 0 at apex to 1 at base
    return 2 * Math.PI * radiusLocal * radius
  }
}

// Convenience for torus: perimeter varies based on cross-section radius
export function torusPerimeterAtDistanceFactory({ matrix, dir }) {
  const axisLen = new THREE.Vector3().setFromMatrixColumn(matrix, 1).length()
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const project = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = project(c0w).length()
  const bW = project(c2w).length()
  const radius = Math.max(aW, bW)
  return (dWorld) => {
    const tLocal = dWorld / Math.max(axisLen, 1e-9)
    const majorRadius = 1.0
    const minorRadius = 0.4
    const distanceFromCenter = Math.abs(tLocal)
    
    let radiusLocal = 0
    if (distanceFromCenter < majorRadius - minorRadius) {
      // Inside the torus hole
      radiusLocal = 0
    } else if (distanceFromCenter < majorRadius + minorRadius) {
      // In the torus body
      const d = distanceFromCenter
      const R = majorRadius
      const r = minorRadius
      // Solve: (d - R)^2 + z^2 = r^2 for z
      const discriminant = r * r - (d - R) * (d - R)
      if (discriminant >= 0) {
        radiusLocal = Math.sqrt(discriminant)
      }
    }
    
    return 2 * Math.PI * radiusLocal * radius
  }
}


