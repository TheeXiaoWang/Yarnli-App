import * as THREE from 'three'
import { buildObjectMatrix, createGeometryForType, stitchSegmentsToPolylines } from '../../layerlines/common'
import { computeStitchDimensions } from '../../layerlines/stitches'
import { desiredFirstCircumference, solveFirstGap, torusPerimeterAtDistanceFactory } from '../../layerlines/firstGap'

export function generateTorusLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const geometry = createGeometryForType('torus')
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox.clone().applyMatrix4(matrix)

  // Stitch dimensions and spacing
  const { height: stitchH } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseHeight: 1,
    baseWidth: 1,
  })
  const stitchStep = Math.max(stitchH, 0.0005)

  // For torus, we slice along the Y axis (perpendicular to the torus plane)
  const axisCol = new THREE.Vector3().setFromMatrixColumn(matrix, 1)
  const topLocal = new THREE.Vector3(0, 1, 0)
  const top = topLocal.clone().applyMatrix4(matrix)
  const bottomLocal = new THREE.Vector3(0, -1, 0)
  const bottom = bottomLocal.clone().applyMatrix4(matrix)
  const dir = top.clone().sub(bottom).normalize() // axis points from bottom → top
  const axisScale = axisCol.length()
  const heightWorld = top.clone().sub(bottom).length()

  // Ensure first ring perimeter can fit 5 edge stitches tightly
  const desiredCirc = desiredFirstCircumference(settings)
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const projW = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = projW(c0w).length()
  const bW = projW(c2w).length()
  const perimeterAt = torusPerimeterAtDistanceFactory({ matrix, dir })
  const solvedGap = solveFirstGap({ targetCircumference: desiredCirc, upperBound: heightWorld, perimeterAt })

  // Calculate layer spacing based on torus height
  const ringCount = Math.min(maxLayers, Math.ceil(heightWorld / stitchStep))
  const axisStep = heightWorld / ringCount
  const offset = solvedGap

  const layers = []
  let lastTAxis = 0

  for (let i = 1; i <= ringCount; i++) {
    let tAxis = offset + i * axisStep // world distance from bottom along axis
    if (tAxis > heightWorld + 1e-6) break
    
    const center = bottom.clone().add(dir.clone().multiplyScalar(tAxis))
    
    // For torus, we need to calculate the radius at this Y position
    // Torus has major radius 1 and minor radius 0.4
    const majorRadius = 1.0
    const minorRadius = 0.4
    const tLocal = tAxis / Math.max(axisScale, 1e-9)
    
    // Calculate distance from torus center to the slice plane
    const distanceFromCenter = Math.abs(tLocal)
    
    // If we're outside the torus, skip this layer
    if (distanceFromCenter > majorRadius + minorRadius) continue
    
    // Calculate the radius of the circular cross-section at this Y position
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
    
    const radiusWorld = radiusLocal * Math.max(aW, bW)
    
    if (radiusWorld <= 0) continue
    
    // Build ellipse axes in plane perpendicular to dir using transformed X/Z columns
    const c0 = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    let u = proj(c0)
    let v = proj(c2)
    const a = u.length()
    const b = v.length()
    
    if (a < 1e-9 && b < 1e-9) continue
    if (a < 1e-9) { 
      u = v.clone().normalize()
      v = new THREE.Vector3().crossVectors(dir, u)
    } else { 
      u.normalize()
      if (b < 1e-9) v = new THREE.Vector3().crossVectors(dir, u)
      else v.normalize()
    }
    
    const segments = 128
    const eps = Math.max(0.0015 * (axisScale + a + b), 0.001)
    const ring = []
    
    for (let s = 0; s < segments; s++) {
      const ang = (s / segments) * Math.PI * 2
      const p = center.clone()
        .add(u.clone().multiplyScalar(radiusWorld * Math.cos(ang)))
        .add(v.clone().multiplyScalar(radiusWorld * Math.sin(ang)))
      
      // push slightly outward along radial direction in the plane
      const radial = p.clone().sub(center)
      if (radial.lengthSq() > 1e-12) p.add(radial.normalize().multiplyScalar(eps))
      ring.push([p.x, p.y, p.z])
    }
    ring.push([...ring[0]])
    
    layers.push({ 
      y: center.dot(dir), 
      polylines: [ring], 
      meta: { shape: 'torus', isBase: false }, 
      debugSource: { file: 'src/layerlines/torus.js', fn: 'generateTorusLayers', kind: 'torus-ring', i } 
    })
    lastTAxis = tAxis
  }

  return { layers, markers: { poles: [], ring0: [] } }
}
