import * as THREE from 'three'
import { computeStitchDimensions } from '../stitches'
import { buildObjectMatrix } from '../common'
import { desiredFirstCircumference as desiredFirstCircumferenceFG, solveFirstGap as solveFirstGapFG } from '../firstGap'

export class UnifiedLayerGenerator {
  constructor(object, settings, maxLayers) {
    this.object = object
    this.settings = settings
    this.maxLayers = maxLayers
    this.matrix = buildObjectMatrix(object)
    this.center = new THREE.Vector3().setFromMatrixPosition(this.matrix)

    // Unified stitch dimensions
    const { height: stitchH } = computeStitchDimensions({
      sizeLevel: settings.yarnSizeLevel ?? 4,
      baseHeight: 1,
      baseWidth: 1,
    })
    this.stitchStep = Math.max(stitchH, 0.0005)
  }

  generate() {
    const shapeConfig = this.getShapeConfig()
    const layers = []
    const markers = { poles: [], ring0: [] }

    // Generate poles
    if (shapeConfig.hasPoles) {
      const poles = this.generatePoles(shapeConfig)
      markers.poles = poles
    }

    // Generate layers with unified spacing
    const layerCoords = this.computeLayerCoordinates(shapeConfig)

    // Debug logging
    console.log(`${this.object.type} generated ${layerCoords.length} coordinates`)

    for (let i = 0; i < layerCoords.length; i++) {
      const coord = layerCoords[i]
      const rings = this.generateRingsAtCoordinate(coord, shapeConfig, i)
      if (rings.length) {
        layers.push({
          y: coord.sortKey,
          polylines: rings,
          meta: shapeConfig.meta,
          objectId: this.object?.id,
          debugSource: {
            file: 'unifiedLayerGenerator.js',
            fn: 'generate',
            kind: `${this.object.type}-ring`,
            localIndex: i
          }
        })
      }
    }

    // Add base face layers for cylinders (bottom and top) like cone base
    if (shapeConfig.type === 'cylinder') {
      const baseLayers = this.generateCylinderBaseLayers(shapeConfig)
      for (const L of baseLayers) layers.push(L)
    }

    console.log(`${this.object.type} generated ${layers.length} layers`)
    return { layers, markers }
  }

  getShapeConfig() {
    switch (this.object.type) {
      case 'cylinder':
        return this.getCylinderConfig()
      case 'capsule':
        return this.getCapsuleConfig()
      default:
        throw new Error(`Unsupported shape: ${this.object.type}`)
    }
  }

  getCylinderConfig() {
    const dir = this.getSliceDirection()
    const height = this.getCylinderHeight()

    // Use first gap logic like other shapes (reuse shared firstGap helpers)
    const desiredCirc = desiredFirstCircumferenceFG(this.settings)
    const perimeterAt = this.cylinderPerimeterAtDistanceFactory(dir)
    const solvedGap = solveFirstGapFG({ targetCircumference: desiredCirc, upperBound: height, perimeterAt })

    return {
      type: 'cylinder',
      hasPoles: true,
      isArcBased: false,
      dir,
      height,
      spacingMode: 'linear',
      solvedGap,
      meta: { shape: 'cylinder' }
    }
  }

  getCapsuleConfig() {
    const dir = this.getSliceDirection()
    const totalHeight = this.getCapsuleHeight()
    const radius = this.getEffectiveRadius()     // horizontal (equatorial) radius in slice plane
    const axialRadius = this.getAxialRadius()    // vertical radius (seam-to-pole)

    // Use first gap logic like other shapes (reuse shared firstGap helpers)
    const desiredCirc = desiredFirstCircumferenceFG(this.settings)
    const perimeterAt = this.capsulePerimeterAtDistanceFactory()
    const solvedGap = solveFirstGapFG({ targetCircumference: desiredCirc, upperBound: totalHeight, perimeterAt })

    return {
      type: 'capsule',
      hasPoles: true,
      isArcBased: true,
      dir,
      totalHeight,
      radius,
      axialRadius,
      spacingMode: 'hybrid',
      solvedGap,
      meta: { shape: 'capsule' }
    }
  }

  computeLayerCoordinates(config) {
    switch (config.spacingMode) {
      case 'linear':
        return this.computeLinearSpacing(config)
      case 'hybrid':
        return this.computeHybridSpacing(config)
    }
  }

  generateRingsAtCoordinate(coord, config, index) {
    switch (config.type) {
      case 'cylinder':
        return this.generateCylinderRing(coord, config)
      case 'capsule':
        return this.generateCapsuleRing(coord, config)
    }
  }

  // Implementation methods...
  getCylinderHeight() {
    // Use actual transformed local Y column length (world height)
    const c1 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 1)
    return c1.length() * 2
  }

  getCapsuleHeight() {
    // Full world height of the capsule along its axis: cylinder length + 2 * axial cap radius
    const lengthY = new THREE.Vector3().setFromMatrixColumn(this.matrix, 1).length() // cylinder length
    const Ry = this.getAxialRadius() // vertical cap radius in world units
    return lengthY + 2 * Ry
  }

  getSliceDirection() {
    // Align slice direction with the object's transformed local Y axis by default,
    // so layers follow the capsule orientation when it is rotated.
    if (Array.isArray(this.settings.sliceDir)) {
      const v = new THREE.Vector3(...this.settings.sliceDir)
      if (v.lengthSq() > 1e-12) return v.normalize()
    }
    const c1 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 1)
    if (c1.lengthSq() > 1e-12) return c1.normalize()
    return new THREE.Vector3(0, 1, 0)
  }

  getEffectiveRadius() {
    // Effective equatorial radius (world units). Columns give diametral scale; radius is half of that.
    const dir = this.getSliceDirection()
    const c0 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    const a = proj(c0).length()
    const b = proj(c2).length()
    return 0.5 * Math.max(a, b)
  }


  getAxialRadius() {
    // Axial (vertical) radius of hemispherical caps in world units: base radius (0.5) scaled by |Y column|
    const c1 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 1)
    return 0.5 * c1.length()
  }

  computeLinearSpacing(config) {
    // Generate from the flat base upward with constant step in WORLD space, like cone base
    const coords = []
    const halfHeight = config.height / 2
    const step = this.stitchStep
    if (step <= 0) return coords

    let d = 0
    let count = 0
    while (d <= config.height - 1e-6 && count < this.maxLayers) {
      const y = -halfHeight + d // base plane at y = -halfHeight
      coords.push({ y, sortKey: y, t: d / config.height, tAxis: d })
      d += step
      count++
    }
    // Ensure a ring exactly on the top rim to connect with the top base
    const topY = halfHeight
    if ((coords.length === 0 || Math.abs(coords[coords.length - 1].y - topY) > 1e-4) && count < this.maxLayers) {
      coords.push({ y: topY, sortKey: topY, t: 1, tAxis: config.height })
    }
    return coords
  }

  computeHybridSpacing(config) {
    // March from bottom pole to top pole with constant step along an approximate meridian arc.
    // Hemispherical caps are treated as quarter-ellipses with horizontal radius Re and vertical radius Ry.
    const coords = []
    const Re = config.radius            // equatorial (horizontal) radius
    const Ry = config.axialRadius       // vertical (seam-to-pole) radius
    const totalHeight = config.totalHeight
    const H = Math.max(0, totalHeight - 2 * Ry) // cylindrical part height (equals cylinder length)
    const halfCyl = H / 2
    const step = this.stitchStep

    if (step <= 0 || Re <= 0 || Ry <= 0) return coords

    // Quarter-ellipse perimeter (Ramanujan) as an approximation for each hemisphere meridian length
    const hemiPerim = (a, b) => {
      const C = Math.PI * (3 * (a + b) - Math.sqrt(Math.max((3 * a + b) * (a + 3 * b), 0)))
      return 0.25 * C
    }
    const hemiLen = hemiPerim(Re, Ry)
    const totalArc = hemiLen + H + hemiLen
    const tol = Math.max(step * 0.02, 1e-5)

    // Start offset: convert axis distance (d0) to arc distance (s0) with a simple linear mapping within each segment
    const d0 = Math.max(0, Math.min(Number(config.solvedGap) || 0, 2 * Ry + H))
    let s0 = 0
    if (d0 <= Ry) {
      s0 = (d0 / Math.max(Ry, 1e-9)) * hemiLen
    } else if (d0 <= Ry + H) {
      s0 = hemiLen + (d0 - Ry)
    } else {
      const dt = d0 - (Ry + H)
      s0 = hemiLen + H + (dt / Math.max(Ry, 1e-9)) * hemiLen
    }

    let s = s0
    let count = 0
    while (s < totalArc - tol && count < this.maxLayers) {
      if (s <= hemiLen + 1e-9) {
        // Bottom hemisphere: parameterize by angle mapped linearly to arc distance
        const theta = (s / hemiLen) * (Math.PI / 2) // 0..pi/2 from bottom pole to seam
        const y = -halfCyl - Ry * Math.cos(theta)
        const r = Re * Math.sin(theta)
        coords.push({ y, sortKey: y, radius: r, section: 'bottom', theta })
      } else if (s <= hemiLen + H + 1e-9) {
        // Cylinder measured from bottom seam upward
        const sCyl = s - hemiLen
        const y = -halfCyl + sCyl // -halfCyl .. +halfCyl
        const r = Re
        coords.push({ y, sortKey: y, radius: r, section: 'cylinder' })
      } else {
        // Top hemisphere measured from top seam upward towards the top pole
        const sTop = s - hemiLen - H // 0..hemiLen
        const phi = (sTop / hemiLen) * (Math.PI / 2)
        const y = halfCyl + Ry * Math.sin(phi)
        const r = Re * Math.cos(phi)
        coords.push({ y, sortKey: y, radius: r, section: 'top', theta: phi })
      }
      s += step
      count++
    }

    return coords.sort((a, b) => a.sortKey - b.sortKey)
  }

  computeSphericalCapLayers(centerY, radius, capType) {
    const coords = []
    const isBottom = capType === 'bottom'

    // Simplified hemisphere generation
    const numLayers = Math.max(2, Math.floor((Math.PI / 2) * radius / this.stitchStep))

    for (let i = 1; i < numLayers; i++) { // Skip poles (i=0 and i=numLayers)
      const t = i / numLayers
      const angle = isBottom ? (Math.PI - t * Math.PI / 2) : (t * Math.PI / 2)

      const y = centerY + radius * Math.cos(angle)
      const ringRadius = radius * Math.sin(angle)

      if (ringRadius > radius * 0.1) { // Skip very small rings near poles
        coords.push({
          y,
          sortKey: y,
          t,
          radius: ringRadius,
          section: capType,
          angle
        })
      }
    }

    return coords
  }

  generateCylinderRing(coord, config) {
    // Center of the ring in WORLD space along the cylinder axis
    const dir = config.dir
    const ringCenter = this.center.clone().add(dir.clone().multiplyScalar(coord.y))

    // Ellipse axes in the plane perpendicular to dir (use projected world X/Z columns)
    const c0 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))

    let u = proj(c0)
    let v = proj(c2)

    // Handle degeneracy if one axis collapses
    if (u.length() < 1e-9 && v.length() < 1e-9) return []
    if (u.length() < 1e-9) { u = v.clone().normalize(); v = new THREE.Vector3().crossVectors(dir, u).multiplyScalar(v.length()) }
    if (v.length() < 1e-9) { v = new THREE.Vector3().crossVectors(dir, u.clone().normalize()).multiplyScalar(u.length()) }

    const a = u.length()
    const b = v.length()
    const perimeter = Math.PI * (3 * (a + b) - Math.sqrt(Math.max((3 * a + b) * (a + 3 * b), 0)))
    const segments = Math.max(16, Math.min(512, Math.round(perimeter / Math.max(this.stitchStep, 1e-4))))

    const ring = []
    for (let s = 0; s < segments; s++) {
      const ang = (s / segments) * Math.PI * 2
      const p = ringCenter.clone()
        .add(u.clone().multiplyScalar(Math.cos(ang)))
        .add(v.clone().multiplyScalar(Math.sin(ang)))
      ring.push([p.x, p.y, p.z])
    }
    ring.push([...ring[0]])
    return [ring]
  }

  generateCylinderBaseLayers(config) {
    const layers = []
    const dir = config.dir
    const half = config.height / 2

    // Ellipse axes for the base disk (project world X/Z onto plane ⟂ dir)
    const c0 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    let ub = proj(c0); let vb = proj(c2)
    let aRim = ub.length(); let bRim = vb.length()

    if (aRim < 1e-9 && bRim < 1e-9) return layers
    if (aRim < 1e-9) { ub = vb.clone().normalize(); vb = new THREE.Vector3().crossVectors(dir, ub); aRim = ub.length(); bRim = vb.length() }
    else { ub.normalize(); if (bRim < 1e-9) { vb = new THREE.Vector3().crossVectors(dir, ub); bRim = vb.length() } else vb.normalize() }

    const radialStep = this.stitchStep
    const segments = 128

    const buildFace = (center, face) => {
      for (let n = 1; ; n++) { // start at 1 to avoid duplicating the rim ring
        const aN = aRim - n * radialStep
        const bN = bRim - n * radialStep
        if (aN <= 1e-6 || bN <= 1e-6) break
        const ring = []
        for (let s = 0; s < segments; s++) {
          const ang = (s / segments) * Math.PI * 2
          const p = center.clone()
            .add(ub.clone().multiplyScalar(aN * Math.cos(ang)))
            .add(vb.clone().multiplyScalar(bN * Math.sin(ang)))
          ring.push([p.x, p.y, p.z])
        }
        ring.push([...ring[0]])
        layers.push({ y: center.dot(dir), polylines: [ring], meta: { shape: 'cylinder', isBase: true, face }, objectId: this.object?.id })
      }
    }

    const baseCenter = this.center.clone().add(dir.clone().multiplyScalar(-half))
    const topCenter  = this.center.clone().add(dir.clone().multiplyScalar(+half))
    buildFace(baseCenter, 'bottom')
    buildFace(topCenter,  'top')

    return layers
  }

  generateCapsuleRing(coord, config) {
    const radius = coord.radius
    if (radius <= 1e-6) return []

    // Use same coordinate system as working sphere
    const dir = config.dir
    const center = this.center.clone()

    // Move center to the ring position along the capsule axis
    const ringCenter = center.add(dir.clone().multiplyScalar(coord.y))

    // Build perpendicular axes that respect non-uniform X/Z scaling
    const c0 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))

    const uRaw = proj(c0)
    const vRaw = proj(c2)
    let aEqu = uRaw.length()
    let bEqu = vRaw.length()

    // Handle degeneracy
    if (aEqu < 1e-9 && bEqu < 1e-9) return []

    let uDir, vDir
    if (aEqu < 1e-9) {
      uDir = vRaw.clone().normalize()
      vDir = new THREE.Vector3().crossVectors(dir, uDir).normalize()
      aEqu = bEqu // fall back to circular when one axis collapses
    } else {
      uDir = uRaw.clone().normalize()
      vDir = (bEqu < 1e-9)
        ? new THREE.Vector3().crossVectors(dir, uDir).normalize()
        : vRaw.clone().normalize()
    }

    // Scale ellipse axes proportionally to the local meridian radius
    // so that at the cylinder section (radius == Rmax) we match cylinder rings exactly
    const Rmax = Math.max(aEqu, bEqu)
    const scale = radius / Math.max(Rmax, 1e-9)
    const u = uDir.multiplyScalar(aEqu * scale)
    const v = vDir.multiplyScalar(bEqu * scale)

    // Generate ring points with segment count based on ellipse perimeter
    const aR = u.length()
    const bR = v.length()
    const perimeter = Math.PI * (3 * (aR + bR) - Math.sqrt(Math.max((3 * aR + bR) * (aR + 3 * bR), 0)))
    const segments = Math.max(16, Math.min(512, Math.round(perimeter / Math.max(this.stitchStep, 1e-4))))
    const ring = []

    for (let s = 0; s < segments; s++) {
      const ang = (s / segments) * Math.PI * 2
      const p = ringCenter.clone()
        .add(u.clone().multiplyScalar(Math.cos(ang)))
        .add(v.clone().multiplyScalar(Math.sin(ang)))

      ring.push([p.x, p.y, p.z])
    }
    ring.push([...ring[0]]) // Close the ring

    return [ring]
  }

  // Helper methods from working shapes
  desiredFirstCircumference() {
    return 5 * (this.settings.stitchSize || 1) // 5 edge stitches
  }

  cylinderPerimeterAtDistanceFactory(dir) {
    // Project transformed X/Z onto plane perpendicular to dir to get world radii
    const c0w = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2w = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    const aW = proj(c0w).length()
    const bW = proj(c2w).length()
    const radius = Math.max(aW, bW)
    return () => 2 * Math.PI * radius
  }

  capsulePerimeterAtDistanceFactory() {
    const dir = this.getSliceDirection()
    const c0w = new THREE.Vector3().setFromMatrixColumn(this.matrix, 0)
    const c2w = new THREE.Vector3().setFromMatrixColumn(this.matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    const aEqu = proj(c0w).length()
    const bEqu = proj(c2w).length()
    const Rmax = Math.max(aEqu, bEqu)

    const Re = this.getEffectiveRadius()
    const Ry = this.getAxialRadius()
    const totalH = this.getCapsuleHeight()
    const H = Math.max(0, totalH - 2 * Ry)

    const ellipsePerimeter = (a, b) => {
      if (a <= 0 || b <= 0) return 0
      return Math.PI * (3 * (a + b) - Math.sqrt(Math.max((3 * a + b) * (a + 3 * b), 0)))
    }

    // distance is measured along the capsule axis from the start pole (bottom)
    return (distance) => {
      const d = Math.max(0, Math.min(distance, 2 * Ry + H))
      let rRel
      if (d <= Ry) {
        // Bottom hemisphere (quarter-ellipse), map axis distance linearly to angle
        const theta = (d / Math.max(Ry, 1e-9)) * (Math.PI / 2)
        rRel = Re * Math.sin(theta)
      } else if (d <= Ry + H) {
        rRel = Re
      } else {
        const dt = d - (Ry + H)
        const phi = (dt / Math.max(Ry, 1e-9)) * (Math.PI / 2)
        rRel = Re * Math.cos(phi)
      }

      if (Rmax <= 1e-9 || rRel <= 1e-9) return 0
      const a = (aEqu / Rmax) * rRel
      const b = (bEqu / Rmax) * rRel
      return ellipsePerimeter(a, b)
    }
  }

  solveFirstGap(targetCircumference, upperBound, perimeterAt) {
    // Simple binary search like other shapes
    let low = 0, high = upperBound
    for (let iter = 0; iter < 20; iter++) {
      const mid = (low + high) / 2
      const perim = perimeterAt(mid)
      if (Math.abs(perim - targetCircumference) < 0.001) return mid
      if (perim < targetCircumference) low = mid
      else high = mid
    }
    return (low + high) / 2
  }

  generatePoles(config) {
    const poles = []

    if (config.type === 'capsule') {
      const dir = config.dir
      const totalHeight = config.totalHeight
      const halfHeight = totalHeight / 2
      // Start at the same pole we begin marching from (negative y side)
      const startPole = this.center.clone().add(dir.clone().multiplyScalar(-halfHeight))
      const endPole = this.center.clone().add(dir.clone().multiplyScalar(+halfHeight))
      poles.push({ p: [startPole.x, startPole.y, startPole.z], role: 'start', objectId: this.object?.id })
      poles.push({ p: [endPole.x, endPole.y, endPole.z], role: 'end', objectId: this.object?.id })
    } else if (config.type === 'cylinder') {
      const dir = config.dir
      const halfHeight = config.height / 2
      const startPole = this.center.clone().add(dir.clone().multiplyScalar(-halfHeight))
      const endPole = this.center.clone().add(dir.clone().multiplyScalar(+halfHeight))
      poles.push({ p: [startPole.x, startPole.y, startPole.z], role: 'start', objectId: this.object?.id })
      poles.push({ p: [endPole.x, endPole.y, endPole.z], role: 'end', objectId: this.object?.id })
    }

    return poles
  }
}








