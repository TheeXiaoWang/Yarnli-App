import * as THREE from 'three'
import { buildObjectMatrix, createGeometryForType, stitchSegmentsToPolylines } from '../../layerlines/common'
import { computeStitchDimensions } from '../../layerlines/stitches'
import { desiredFirstCircumference, solveFirstGap, capsulePerimeterAtDistanceFactory } from '../../layerlines/firstGap'

export function generateCapsuleLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const geometry = createGeometryForType('capsule')
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox.clone().applyMatrix4(matrix)

  // Stitch dimensions and spacing
  const { height: stitchH } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseHeight: 1,
    baseWidth: 1,
  })
  const stitchStep = Math.max(stitchH, 0.0005)

  // For capsules, the axis is along the Y direction (height)
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
  const perimeterAt = capsulePerimeterAtDistanceFactory({ matrix, dir })
  const solvedGap = solveFirstGap({ targetCircumference: desiredCirc, upperBound: heightWorld, perimeterAt })

  // Calculate layer spacing based on capsule height
  const ringCount = Math.min(maxLayers, Math.ceil(heightWorld / stitchStep))
  const axisStep = heightWorld / ringCount
  const offset = solvedGap

  const layers = []
  let lastTAxis = 0

  for (let i = 1; i <= ringCount; i++) {
    let tAxis = offset + i * axisStep // world distance from bottom along axis
    if (tAxis > heightWorld + 1e-6) break
    
    const center = bottom.clone().add(dir.clone().multiplyScalar(tAxis))
    
    // For capsule, radius varies along the height
    // Capsule has radius 0.5 at the ends and 0.5 in the middle
    const tLocal = tAxis / Math.max(axisScale, 1e-9)
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
      meta: { shape: 'capsule', isBase: false }, 
      debugSource: { file: 'src/layerlines/capsule.js', fn: 'generateCapsuleLayers', kind: 'capsule-ring', i } 
    })
    lastTAxis = tAxis
  }

  // Markers: top is start, bottom is end
  const markers = { poles: [
    { p: [top.x, top.y, top.z], role: 'start', objectId: object?.id },
    { p: [bottom.x, bottom.y, bottom.z], role: 'end', objectId: object?.id },
  ], ring0: [] }
  if (layers.length > 0 && layers[0].polylines.length > 0) {
    // take the longest polyline as the main ring
    const ring = layers[0].polylines.reduce((a, b) => (b.length > a.length ? b : a))
    markers.ring0.push(ring)
  }

  return { layers, markers }
}
