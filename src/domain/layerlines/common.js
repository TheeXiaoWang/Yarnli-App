import * as THREE from 'three'

export const DEG2RAD = Math.PI / 180
export const EPS = 1e-4

export const AXIS = { X: 'x', Y: 'y', Z: 'z' }
export const AXIS_TO_INDEX = { x: 0, y: 1, z: 2 }

export function buildObjectMatrix(object) {
  const position = new THREE.Vector3(object.position[0], object.position[1], object.position[2])
  const rotation = new THREE.Euler(
    (object.rotation[0] || 0) * DEG2RAD,
    (object.rotation[1] || 0) * DEG2RAD,
    (object.rotation[2] || 0) * DEG2RAD,
    'XYZ'
  )
  const scale = new THREE.Vector3(object.scale[0], object.scale[1], object.scale[2])
  const matrix = new THREE.Matrix4()
  matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale)
  return matrix
}

export function createGeometryForType(type) {
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(1, 48, 48)
    case 'cone':
      return new THREE.ConeGeometry(1, 2, 48)
    case 'triangle':
      // Triangular prism of height 2 along Y with radius 1
      return new THREE.CylinderGeometry(1, 1, 2, 3)
    default:
      return null
  }
}

export function worldPlaneForAxis(axis, coord) {
  switch (axis) {
    case AXIS.X: return new THREE.Plane(new THREE.Vector3(1, 0, 0), -coord)
    case AXIS.Z: return new THREE.Plane(new THREE.Vector3(0, 0, 1), -coord)
    case AXIS.Y:
    default: return new THREE.Plane(new THREE.Vector3(0, 1, 0), -coord)
  }
}

export function sliceGeometryByPlane(geometry, matrixWorld, plane) {
  if (!geometry) return []
  const positionAttr = geometry.getAttribute('position')
  const indexAttr = geometry.getIndex()

  const getVertex = (i) => {
    const v = new THREE.Vector3(
      positionAttr.getX(i),
      positionAttr.getY(i),
      positionAttr.getZ(i)
    )
    return v.applyMatrix4(matrixWorld)
  }

  const segments = []
  const triCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 3
  for (let i = 0; i < triCount; i++) {
    const i0 = indexAttr ? indexAttr.getX(i * 3 + 0) : i * 3 + 0
    const i1 = indexAttr ? indexAttr.getX(i * 3 + 1) : i * 3 + 1
    const i2 = indexAttr ? indexAttr.getX(i * 3 + 2) : i * 3 + 2

    const p0 = getVertex(i0)
    const p1 = getVertex(i1)
    const p2 = getVertex(i2)

    const d0 = plane.distanceToPoint(p0)
    const d1 = plane.distanceToPoint(p1)
    const d2 = plane.distanceToPoint(p2)

    const pts = []
    const addIntersection = (a, da, b, db) => {
      const denom = da - db
      if (Math.abs(denom) < EPS) return
      const t = da / (da - db)
      if (t <= -EPS || t >= 1 + EPS) return
      const point = new THREE.Vector3().copy(a).lerp(b, t)
      pts.push(point)
    }

    const s0 = Math.sign(d0)
    const s1 = Math.sign(d1)
    const s2 = Math.sign(d2)

    if ((s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0)) continue

    addIntersection(p0, d0, p1, d1)
    addIntersection(p1, d1, p2, d2)
    addIntersection(p2, d2, p0, d0)

    if (pts.length === 2) {
      segments.push([pts[0], pts[1]])
    }
  }

  return segments
}

export function stitchSegmentsToPolylines(segments) {
  const unused = segments.slice()
  const polylines = []
  const take = (idx) => unused.splice(idx, 1)[0]
  const equals = (a, b) => a.distanceTo(b) < 1e-2

  while (unused.length > 0) {
    const seg = take(0)
    const line = [seg[0], seg[1]]

    let extended = true
    let guard = 0
    while (extended && guard < 10000) {
      guard++
      extended = false
      for (let i = 0; i < unused.length; i++) {
        const [a, b] = unused[i]
        const head = line[0]
        const tail = line[line.length - 1]

        if (equals(b, head)) {
          line.unshift(a)
          take(i)
          extended = true
          break
        } else if (equals(a, head)) {
          line.unshift(b)
          take(i)
          extended = true
          break
        } else if (equals(a, tail)) {
          line.push(b)
          take(i)
          extended = true
          break
        } else if (equals(b, tail)) {
          line.push(a)
          take(i)
          extended = true
          break
        }
      }
    }

    // Close loop if endpoints meet
    const head = line[0]
    const tail = line[line.length - 1]
    if (equals(head, tail) === false) {
      if (head.distanceTo(tail) < 1e-2) {
        line.push(head.clone())
      }
    }
    polylines.push(line.map((v) => [v.x, v.y, v.z]))
  }

  return polylines
}

export function computeSceneBBox(objects) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

  for (const obj of objects) {
    if (!obj.visible) continue
    const matrix = buildObjectMatrix(obj)
    const geometry = createGeometryForType(obj.type)
    if (!geometry) continue

    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox.clone()
    bbox.applyMatrix4(matrix)

    min.min(bbox.min)
    max.max(bbox.max)
  }

  if (!isFinite(min.x)) return { min: [-5, -5, -5], max: [5, 5, 5] }
  return { min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] }
}

export function getWidestAxis(object) {
  const [sx, sy, sz] = object.scale.map((v) => Math.abs(v))
  if (sx >= sy && sx >= sz) return AXIS.X
  if (sy >= sx && sy >= sz) return AXIS.Y
  return AXIS.Z
}

// Backward compatibility helper for existing Y-slicing callers
export function sliceGeometryAtY(geometry, matrixWorld, sliceY) {
  return sliceGeometryByPlane(geometry, matrixWorld, worldPlaneForAxis(AXIS.Y, sliceY))
}

export function computeObjectBBox(object) {
  const geometry = createGeometryForType(object.type)
  if (!geometry) return null
  const matrix = buildObjectMatrix(object)
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox.clone().applyMatrix4(matrix)
  return bbox
}

export function getWorldCenter(object) {
  const matrix = buildObjectMatrix(object)
  return new THREE.Vector3().setFromMatrixPosition(matrix)
}

export function aabbsIntersect(a, b) {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  )
}

export function isPointInsideObject(worldPoint, object) {
  const matrix = buildObjectMatrix(object)
  const inv = new THREE.Matrix4().copy(matrix).invert()
  const p = (worldPoint && typeof worldPoint.x === 'number')
    ? new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z).applyMatrix4(inv)
    : worldPoint.clone().applyMatrix4(inv)
  if (object.type === 'sphere') {
    return p.lengthSq() <= 1.0 + EPS
  }
  if (object.type === 'cone') {
    // Cone with height 2 along Y, base radius 1 at y=-1, apex at y=+1
    if (p.y < -1 - EPS || p.y > 1 + EPS) return false
    const rAtY = (1 - p.y) / 2 // linear from 1 at y=-1 to 0 at y=+1
    const radial = Math.sqrt(p.x * p.x + p.z * p.z)
    return radial <= rAtY + EPS
  }
  return false
}

// Inside test with adjustable margin that effectively shrinks the cutter by 'shrink'
// in local units (positive shrink means treat a smaller cutter → keeps a bit more outside).
export function isPointInsideObjectWithMargin(worldPoint, object, shrink = 0) {
  const matrix = buildObjectMatrix(object)
  const inv = new THREE.Matrix4().copy(matrix).invert()
  const p = (worldPoint && typeof worldPoint.x === 'number')
    ? new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z).applyMatrix4(inv)
    : worldPoint.clone().applyMatrix4(inv)
  const margin = Math.max(0, shrink)
  if (object.type === 'sphere') {
    // unit sphere shrunk by margin: radius = 1 - margin
    const r = Math.max(0, 1 - margin)
    return p.lengthSq() <= r * r + EPS
  }
  if (object.type === 'cone') {
    if (p.y < -1 - EPS || p.y > 1 + EPS) return false
    const base = Math.max(0, 1 - margin) // shrink base radius uniformly
    const rAtY = ((1 - p.y) / 2) * base
    const radial = Math.sqrt(p.x * p.x + p.z * p.z)
    return radial <= rAtY + EPS
  }
  return isPointInsideObject(worldPoint, object)
}

export function estimateNonOverlappingVolume(objectA, objectB, samples = 2000) {
  const bboxA = computeObjectBBox(objectA)
  if (!bboxA) return 0
  const dx = Math.max(0, bboxA.max.x - bboxA.min.x)
  const dy = Math.max(0, bboxA.max.y - bboxA.min.y)
  const dz = Math.max(0, bboxA.max.z - bboxA.min.z)
  const bboxVolume = dx * dy * dz || 0
  if (bboxVolume === 0) return 0
  let countOutside = 0
  for (let i = 0; i < samples; i++) {
    const x = THREE.MathUtils.lerp(bboxA.min.x, bboxA.max.x, Math.random())
    const y = THREE.MathUtils.lerp(bboxA.min.y, bboxA.max.y, Math.random())
    const z = THREE.MathUtils.lerp(bboxA.min.z, bboxA.max.z, Math.random())
    const wp = new THREE.Vector3(x, y, z)
    // Only accumulate when point lies in A but not in B (A \ B)
    if (isPointInsideObject(wp, objectA) && !isPointInsideObject(wp, objectB)) {
      countOutside++
    }
  }
  // Convert sample count to an absolute volume estimate within bboxA
  return (countOutside / Math.max(1, samples)) * bboxVolume
}

export function clipPolylinesAgainstObject(polylines, object, opts) {
  const result = []
  let hadIntersection = false
  const boundaryPoints = []
  const shrink = Math.max(0, opts?.shrink ?? 0)
  const isOutside = (p) => !isPointInsideObjectWithMargin(new THREE.Vector3(p[0], p[1], p[2]), object, shrink)
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  const findBoundary = (a, b) => {
    // binary search for boundary between outside/inside along segment
    let t0 = 0, t1 = 1
    let pa = a, pb = b
    for (let i = 0; i < 12; i++) {
      const tm = (t0 + t1) / 2
      const pm = lerp(a, b, tm)
      if (isOutside(pm)) { t0 = tm; pa = pm } else { t1 = tm; pb = pm }
    }
    return lerp(a, b, (t0 + t1) / 2)
  }

  for (const poly of polylines) {
    if (!poly || poly.length < 2) continue
    let current = []
    const outsideFlags = poly.map((p) => isOutside(p))
    for (let i = 0; i < poly.length - 1; i++) {
      const p0 = poly[i]
      const p1 = poly[i + 1]
      const o0 = outsideFlags[i]
      const o1 = outsideFlags[i + 1]
      if (o0 && o1) {
        if (current.length === 0) current.push(p0)
        current.push(p1)
      } else if (o0 && !o1) {
        // leaving region: add boundary then close
        const bdy = findBoundary(p0, p1)
        boundaryPoints.push(bdy)
        if (current.length === 0) current.push(p0)
        current.push(bdy)
        result.push(current)
        current = []
        hadIntersection = true
      } else if (!o0 && o1) {
        // entering region: start new at boundary
        const bdy = findBoundary(p0, p1)
        boundaryPoints.push(bdy)
        current = [bdy, p1]
        hadIntersection = true
      } else {
        // both inside: skip segment
        // ensure we close current if open
        if (current.length > 0) {
          result.push(current)
          current = []
        }
      }
    }
    if (current.length > 1) result.push(current)
  }

  return { polylines: result, hadIntersection, boundaryPoints }
}

function pickSpanningTriplet(points) {
  if (points.length < 3) return null
  const p0 = new THREE.Vector3(...points[0])
  let idx1 = 1
  let maxD = -Infinity
  for (let i = 1; i < points.length; i++) {
    const pi = new THREE.Vector3(...points[i])
    const d = pi.distanceToSquared(p0)
    if (d > maxD) { maxD = d; idx1 = i }
  }
  const p1 = new THREE.Vector3(...points[idx1])
  let idx2 = 0
  maxD = -Infinity
  for (let i = 0; i < points.length; i++) {
    if (i === idx1) continue
    const pi = new THREE.Vector3(...points[i])
    const area = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(pi, p0)).lengthSq()
    if (area > maxD) { maxD = area; idx2 = i }
  }
  const p2 = new THREE.Vector3(...points[idx2])
  return { p0, p1, p2 }
}

export function buildIntersectionLoop(points) {
  if (!points || points.length < 2) return []
  // Deduplicate nearby points
  const uniq = []
  for (const p of points) {
    if (uniq.length === 0) uniq.push(p)
    else {
      const last = uniq[uniq.length - 1]
      const dx = p[0] - last[0], dy = p[1] - last[1], dz = p[2] - last[2]
      if (dx * dx + dy * dy + dz * dz > 1e-6) uniq.push(p)
    }
  }
  if (uniq.length < 2) return []

  // Centroid
  const cx = uniq.reduce((a, p) => a + p[0], 0) / uniq.length
  const cy = uniq.reduce((a, p) => a + p[1], 0) / uniq.length
  const cz = uniq.reduce((a, p) => a + p[2], 0) / uniq.length
  const center = new THREE.Vector3(cx, cy, cz)

  // Approximate normal using a spanning triplet
  let normal = new THREE.Vector3(0, 1, 0)
  const triplet = pickSpanningTriplet(uniq)
  if (triplet) {
    normal = new THREE.Vector3().subVectors(triplet.p1, triplet.p0).cross(new THREE.Vector3().subVectors(triplet.p2, triplet.p0)).normalize()
    if (!isFinite(normal.x)) normal.set(0, 1, 0)
  }

  // Basis on plane
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(u.dot(normal)) > 0.9) u.set(0, 1, 0)
  u.sub(normal.clone().multiplyScalar(u.dot(normal))).normalize()
  const v = new THREE.Vector3().crossVectors(normal, u)

  // Sort by angle in plane
  const sorted = uniq
    .map((p) => {
      const pv = new THREE.Vector3(p[0] - cx, p[1] - cy, p[2] - cz)
      const x = pv.dot(u)
      const y = pv.dot(v)
      const angle = Math.atan2(y, x)
      return { p, angle }
    })
    .sort((a, b) => a.angle - b.angle)
    .map(({ p }) => p)

  // Close loop by repeating first point if not close
  if (sorted.length > 2) {
    const f = sorted[0], l = sorted[sorted.length - 1]
    const dx = f[0] - l[0], dy = f[1] - l[1], dz = f[2] - l[2]
    if (dx * dx + dy * dy + dz * dz > 1e-6) sorted.push(f)
  }
  return sorted
}
