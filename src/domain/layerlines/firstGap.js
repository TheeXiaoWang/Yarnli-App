import * as THREE from 'three'
import { computeStitchDimensions } from './stitches'
import { STITCH_TYPES } from '../../constants/stitchTypes'

// Compute desired first-ring circumference for 5 edge stitches
export function desiredFirstCircumference(settings) {
  const gauge = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4, baseWidth: 1, baseHeight: 1 })
  const edge = STITCH_TYPES.edge || STITCH_TYPES.sc
  const widthMul = edge.widthMul ?? ((edge.width ?? 0.5) / 0.5)
  const PACKING = 0.9
  const spacing = gauge.width * widthMul * PACKING
  return Math.max(1e-6, 5 * spacing)
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


