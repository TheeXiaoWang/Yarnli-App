import * as THREE from 'three'
import { buildObjectMatrix, AXIS, getWidestAxis } from '../../layerlines/common'
import { computeStitchDimensions } from '../../layerlines/stitches'

function sliceSphereAnalytic(matrixWorld, planeWorld, segments = 128, outwardBias = 0) {
  const inv = new THREE.Matrix4().copy(matrixWorld).invert()
  const planeLocal = planeWorld.clone().applyMatrix4(inv)
  planeLocal.normalize()
  const d = -planeLocal.constant
  if (Math.abs(d) > 1) return []
  const r = Math.sqrt(Math.max(1 - d * d, 0))
  const n = planeLocal.normal.clone()
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(n.dot(u)) > 0.9) u.set(0, 1, 0)
  u.crossVectors(n, u).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  const centerLocal = n.clone().multiplyScalar(-planeLocal.constant)
  const pts = []

  // Estimate scale to derive a safe world-space offset and compute normal matrix
  const sx = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 0).length()
  const sy = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 1).length()
  const sz = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 2).length()
  const avgScale = (sx + sy + sz) / 3
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld)
  const outwardEpsilon = Math.max(0.01 * avgScale, 0.0015, outwardBias)
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const pLocal = new THREE.Vector3().copy(centerLocal)
      .addScaledVector(u, r * Math.cos(a))
      .addScaledVector(v, r * Math.sin(a))
    const pWorld = pLocal.clone().applyMatrix4(matrixWorld)
    // Push slightly outward along the correct world normal to avoid z-fighting with the mesh surface
    const nLocal = pLocal.lengthSq() > 0 ? pLocal.clone().normalize() : n.clone()
    const nWorld = nLocal.applyMatrix3(normalMatrix).normalize()
    pWorld.addScaledVector(nWorld, outwardEpsilon)
    pts.push([pWorld.x, pWorld.y, pWorld.z])
  }
  // explicitly close loop
  if (pts.length > 2) pts.push([...pts[0]])
  return [pts]
}

// Slice the UNIT sphere in LOCAL space by a plane defined directly in local coords:
// nLocal · x = dLocal, with |dLocal| <= 1. Returns world-space polyline(s).
function sliceSphereLocal(matrixWorld, nLocal, dLocal, segments = 128, outwardBias = 0) {
  const n = nLocal.clone().normalize()
  const d = Math.max(-1, Math.min(1, dLocal))
  const r = Math.sqrt(Math.max(1 - d * d, 0))
  // Build orthonormal basis (u, v) on the plane
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(n.dot(u)) > 0.9) u.set(0, 1, 0)
  u.crossVectors(n, u).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  const centerLocal = n.clone().multiplyScalar(d)

  const sx = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 0).length()
  const sy = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 1).length()
  const sz = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 2).length()
  const avgScale = (sx + sy + sz) / 3
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld)
  const outwardEpsilon = Math.max(0.01 * avgScale, 0.0015, outwardBias)

  // Choose segment count based on estimated world-space perimeter of the transformed ring (ellipse)
  const linear = new THREE.Matrix3().setFromMatrix4(matrixWorld)
  const wu = u.clone().applyMatrix3(linear)
  const wv = v.clone().applyMatrix3(linear)
  const a = wu.length() * r
  const b = wv.length() * r
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt(Math.max((3 * a + b) * (a + 3 * b), 0)))
  const targetSegLen = 0.08 // world units (finer near small stitches)
  const segCount = Math.max(16, Math.min(512, Math.round(perimeter / Math.max(targetSegLen, 1e-4))))

  const pts = []
  for (let i = 0; i < segCount; i++) {
    const a = (i / segCount) * Math.PI * 2
    const pLocal = new THREE.Vector3().copy(centerLocal)
      .addScaledVector(u, r * Math.cos(a))
      .addScaledVector(v, r * Math.sin(a))
    const pWorld = pLocal.clone().applyMatrix4(matrixWorld)
    const nWorld = pLocal.lengthSq() > 0 ? pLocal.clone().normalize().applyMatrix3(normalMatrix).normalize() : n.clone().applyMatrix3(normalMatrix).normalize()
    pWorld.addScaledVector(nWorld, outwardEpsilon)
    pts.push([pWorld.x, pWorld.y, pWorld.z])
  }
  // explicitly close loop
  if (pts.length > 2) pts.push([...pts[0]])
  return [pts]
}

// Generate uniformly spaced plane coordinates along the given slicing direction (world space),
// such that the distance between adjacent layers measured along that direction equals stitch height.
function computeUniformPlaneCoords(matrixWorld, center, dir, step, maxLayers) {
  const c0 = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 0)
  const c1 = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 1)
  const c2 = new THREE.Vector3().setFromMatrixColumn(matrixWorld, 2)
  const rDir = Math.sqrt(
    Math.pow(dir.dot(c0), 2) +
    Math.pow(dir.dot(c1), 2) +
    Math.pow(dir.dot(c2), 2)
  )

  const top = dir.dot(center) + rDir
  const bottom = dir.dot(center) - rDir

  const coords = []
  if (step <= 0) return coords
  const total = Math.min(maxLayers, Math.max(0, Math.floor((top - bottom) / step)))
  for (let i = 0; i < total; i++) {
    const coord = top - (i + 1) * step
    if (coord <= bottom + 1e-6) break
    coords.push(coord)
  }
  return { coords, rDir, basis: { c0, c1, c2 } }
}

// Numerically integrate the meridian arc length from 0..theta using composite Simpson's rule
function integrateArcLength(theta, metricFn, nBase = 1024) {
  if (theta <= 0) return 0
  let n = Math.max(64, Math.ceil((theta / Math.PI) * nBase))
  if (n % 2 === 1) n += 1 // Simpson requires even
  const h = theta / n
  let s = metricFn(0) + metricFn(theta)
  for (let i = 1; i < n; i++) {
    const t = i * h
    s += (i % 2 === 0 ? 2 : 4) * metricFn(t)
  }
  return (s * h) / 3
}

export function generateSphereLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const axis = getWidestAxis(object)
  const center = new THREE.Vector3().setFromMatrixPosition(matrix)

  // Determine slicing direction in world space
  const dir = new THREE.Vector3(
    settings.sliceDir?.[0] ?? 0,
    settings.sliceDir?.[1] ?? 0,
    settings.sliceDir?.[2] ?? 0
  )
  if (dir.length() < 1e-6) {
    dir.setFromMatrixColumn(matrix, axis === AXIS.X ? 0 : axis === AXIS.Y ? 1 : 2)
  }
  dir.normalize()

  // Stitch height defines world-space distance between adjacent layers (surface arc length)
  const { height: stitchH } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseHeight: 1,
    baseWidth: 1,
  })
  // Use stitch height directly so same yarn size produces the same spacing regardless of scale
  const step = Math.max(stitchH || settings.layerHeight || 0.2, 0.0005)

  // Build local orthonormal basis with pole along dir in LOCAL space
  const invNormal = new THREE.Matrix3().getNormalMatrix(new THREE.Matrix4().copy(matrix).invert())
  const poleLocal = new THREE.Vector3().copy(dir).applyMatrix3(invNormal).normalize()
  let uLocal = new THREE.Vector3(1, 0, 0)
  if (Math.abs(uLocal.dot(poleLocal)) > 0.9) uLocal.set(0, 1, 0)
  uLocal.sub(poleLocal.clone().multiplyScalar(uLocal.dot(poleLocal))).normalize()
  const vLocal = new THREE.Vector3().crossVectors(poleLocal, uLocal)

  // Linear part for world-length evaluation
  const linear = new THREE.Matrix3().setFromMatrix4(matrix)
  const aAxis = poleLocal.clone().applyMatrix3(linear).length()
  const aU = uLocal.clone().applyMatrix3(linear).length()
  const aV = vLocal.clone().applyMatrix3(linear).length()
  const aEqu = Math.sqrt((aU * aU + aV * aV) / 2)
  const aAxisDir = new THREE.Vector3().copy(poleLocal).applyMatrix3(linear)
  const rDir = Math.abs(aAxisDir.dot(dir)) // effective radius along slice dir for sorting

  const metric = (theta) => {
    const s = Math.sin(theta)
    const c = Math.cos(theta)
    return Math.sqrt((aAxis * s) * (aAxis * s) + (aEqu * c) * (aEqu * c))
  }

  const layers = []
  // Target arc lengths: k * step up to total arc at pi
  const stepsEstimate = Math.max(1, Math.ceil((aAxis + aEqu) * Math.PI / Math.max(step, 1e-6)))
  const nBase = Math.min(8192, Math.max(512, stepsEstimate * 2))
  const totalArc = integrateArcLength(Math.PI, metric, nBase)
  const tol = Math.max(step * 0.02, 1e-5)
  let k = 1
  let prevTheta = 0
  let localIdx = 0
  while (k * step < totalArc - tol && k <= maxLayers) {
    const target = k * step
    // Newton-Bisection hybrid to solve arc(theta)=target
    let lo = prevTheta, hi = Math.PI
    let theta = prevTheta + step / Math.max(metric(prevTheta > 0 ? prevTheta : 1e-4), 1e-6)
    theta = Math.min(Math.max(theta, lo + 1e-6), hi - 1e-6)
    for (let it = 0; it < 20; it++) {
      const f = integrateArcLength(theta, metric, nBase) - target
      if (Math.abs(f) < tol) break
      const d = metric(theta)
      const newTheta = theta - f / Math.max(d, 1e-6)
      if (newTheta <= lo || newTheta >= hi || !isFinite(newTheta)) {
        // fall back to bisection step
        theta = (lo + hi) / 2
      } else {
        theta = newTheta
      }
      if (f > 0) hi = Math.min(hi, theta)
      else lo = Math.max(lo, theta)
    }
    const cosT = Math.cos(theta)
    const rings = sliceSphereLocal(matrix, poleLocal, cosT)
    // y used for sorting only; spacing is geodesic and independent of axis scale
    const tSort = dir.dot(center) + rDir * cosT
    if (rings.length) layers.push({ y: tSort, polylines: rings, debugSource: { file: 'src/layerlines/sphere.js', fn: 'generateSphereLayers', kind: 'sphere-ring', localIndex: localIdx } })
    prevTheta = theta
    k++
    localIdx++
  }

  // Do not force an extra "near-pole" ring. This preserves uniform spacing between
  // consecutive rings, and lets the final pole gap absorb the remainder (which is
  // desirable for closing in crochet patterns).

  // Poles computed robustly for arbitrarily oriented/anisotropically scaled sphere
  const c0 = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
  const c1 = new THREE.Vector3().setFromMatrixColumn(matrix, 1)
  const c2 = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
  const mtDir = new THREE.Vector3(dir.dot(c0), dir.dot(c1), dir.dot(c2))
  const uLocal2 = mtDir.normalize()
  const northOffset = c0
    .clone()
    .multiplyScalar(uLocal2.x)
    .add(c1.clone().multiplyScalar(uLocal2.y))
    .add(c2.clone().multiplyScalar(uLocal2.z))
  const north = center.clone().add(northOffset)
  const south = center.clone().sub(northOffset)

  // Optional: if the gap from the far pole to the current last ring is larger
  // than half a stitch, add one more ring toward the pole so the remainder is left
  // at the pole (crochet closing) but we avoid a very large terminal gap.
  if (layers.length > 0) {
    try {
      const lastMain = layers[layers.length - 1].polylines?.[0]
      if (lastMain && lastMain.length > 0 && isFinite(rDir) && rDir > 1e-9) {
        const lastMid = new THREE.Vector3(...lastMain[Math.floor(lastMain.length / 2)])
        const gapEuclid = south.distanceTo(lastMid)
        const half = (computeStitchDimensions({ sizeLevel: settings.yarnSizeLevel ?? 4, baseHeight: 1, baseWidth: 1 }).height || 0) * 0.5
        if (gapEuclid > half) {
          const tSortLast = layers[layers.length - 1].y
          const cosTLast = (tSortLast - dir.dot(center)) / rDir
          const thetaLast = Math.acos(Math.max(-1, Math.min(1, cosTLast)))
          const dTheta = (Math.max(1e-6, step)) / Math.max(aEqu, 1e-6)
          const thetaNew = Math.min(Math.PI - 1e-5, thetaLast + dTheta)
          const cosTNew = Math.cos(thetaNew)
          const ringsNew = sliceSphereLocal(matrix, poleLocal, cosTNew)
          const tSortNew = dir.dot(center) + rDir * cosTNew
          if (ringsNew && ringsNew.length) {
            layers.push({ y: tSortNew, polylines: ringsNew, debugSource: { file: 'src/layerlines/sphere.js', fn: 'generateSphereLayers', kind: 'sphere-ring', localIndex: layers.length } })
          }
        }
      }
    } catch (_) {}
  }

  // Tag poles with roles start/end based on proximity to first/last rings along axis
  let startPole = north
  let endPole = south
  if (layers.length > 0) {
    try {
      const firstMid = new THREE.Vector3(...layers[0].polylines[0][Math.floor(layers[0].polylines[0].length / 2)])
      const lastMid = new THREE.Vector3(...layers[layers.length - 1].polylines[0][Math.floor(layers[layers.length - 1].polylines[0].length / 2)])
      const dNorthFirst = firstMid.clone().sub(north).lengthSq()
      const dSouthFirst = firstMid.clone().sub(south).lengthSq()
      // Start pole = closer to first ring; end pole = other one
      if (dSouthFirst < dNorthFirst) { startPole = south; endPole = north }
      else { startPole = north; endPole = south }
    } catch (_) {}
  }
  // Provide ring0 polyline for emphasis/visibility in the viewer
  const ring0 = (layers.length > 0 && layers[0].polylines && layers[0].polylines[0]) ? layers[0].polylines[0] : null
  const markersOut = {
    poles: [{ p: [startPole.x, startPole.y, startPole.z], role: 'start' }, { p: [endPole.x, endPole.y, endPole.z], role: 'end' }],
    ring0: ring0 ? [ring0] : []
  }
  return { layers, markers: markersOut }
}
