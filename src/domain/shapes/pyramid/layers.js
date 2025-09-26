import * as THREE from 'three'
import { buildObjectMatrix, createGeometryForType, stitchSegmentsToPolylines } from '../../layerlines/common'
import { computeStitchDimensions } from '../../layerlines/stitches'
import { desiredFirstCircumference, solveFirstGap, pyramidPerimeterAtDistanceFactory } from '../../layerlines/firstGap'

export function generatePyramidLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const geometry = createGeometryForType('pyramid')
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox.clone().applyMatrix4(matrix)

  // Stitch dimensions and spacing
  const { height: stitchH } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseHeight: 1,
    baseWidth: 1,
  })
  const stitchStep = Math.max(stitchH, 0.0005)

  // For pyramids, the pole is the apex (local +Y after transform)
  const axisCol = new THREE.Vector3().setFromMatrixColumn(matrix, 1)
  const apexLocal = new THREE.Vector3(0, 1, 0)
  const apex = apexLocal.clone().applyMatrix4(matrix)
  const baseLocal = new THREE.Vector3(0, -1, 0)
  const base = baseLocal.clone().applyMatrix4(matrix)
  const dir = base.clone().sub(apex).normalize() // ensure axis points from apex → base
  const axisScale = axisCol.length()
  const heightWorld = base.clone().sub(apex).length()

  // Ensure first ring perimeter can fit 5 edge stitches tightly
  const desiredCirc = desiredFirstCircumference(settings)
  const c0w = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c2w = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const projW = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
  const aW = projW(c0w).length()
  const bW = projW(c2w).length()
  const perimeterAt = pyramidPerimeterAtDistanceFactory({ matrix, dir })
  const solvedGap = solveFirstGap({ targetCircumference: desiredCirc, upperBound: heightWorld, perimeterAt })

  // Calculate layer spacing based on pyramid height
  const ringCount = Math.min(maxLayers, Math.ceil(heightWorld / stitchStep))
  const axisStep = heightWorld / ringCount
  const offset = solvedGap

  const layers = []
  let lastTAxis = 0

  for (let i = 1; i <= ringCount; i++) {
    let tAxis = offset + i * axisStep // world distance from apex along axis
    if (tAxis > heightWorld + 1e-6) break
    
    const center = apex.clone().add(dir.clone().multiplyScalar(tAxis))
    
    // For pyramid, radius increases linearly from apex to base
    const tLocal = tAxis / Math.max(axisScale, 1e-9)
    const radiusLocal = tLocal / 2 // Linear increase from 0 at apex to 1 at base
    
    if (radiusLocal <= 0) continue
    
    const radiusWorld = radiusLocal * Math.max(aW, bW)
    
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
      meta: { shape: 'pyramid', isBase: false }, 
      debugSource: { file: 'src/layerlines/pyramid.js', fn: 'generatePyramidLayers', kind: 'pyramid-ring', i } 
    })
    lastTAxis = tAxis
  }

  return { layers, markers: { poles: [], ring0: [] } }
}
