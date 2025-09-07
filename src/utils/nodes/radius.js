import * as THREE from 'three'

export function estimateR0FromRing0(markers, center) {
  const ring0 = markers?.ring0
  const poly = Array.isArray(ring0) && ring0.length > 0 ? ring0[0] : null
  if (!poly || poly.length === 0) return null
  const c = center
  let sum = 0
  let count = 0
  for (const p of poly) {
    if (!Array.isArray(p) || p.length < 3) continue
    const v = new THREE.Vector3(p[0], p[1], p[2])
    const dx = v.x - c.x
    const dz = v.z - c.z
    sum += Math.hypot(dx, dz)
    count++
  }
  if (count === 0) return null
  return sum / count
}

export function averageRadiusFromPolyline(poly, center) {
  if (!Array.isArray(poly) || poly.length === 0) return null
  const c = center
  let sum = 0
  let count = 0
  for (const p of poly) {
    if (!Array.isArray(p) || p.length < 3) continue
    const v = new THREE.Vector3(p[0], p[1], p[2])
    const dx = v.x - c.x
    const dz = v.z - c.z
    sum += Math.hypot(dx, dz)
    count++
  }
  if (count === 0) return null
  return sum / count
}

export function sampleRadiusAtY(layers, yTarget, center) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let best = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    const dy = Math.abs(y - yTarget)
    if (dy < bestDy) { bestDy = dy; best = l }
  }
  const poly = best?.polylines?.[0]
  return averageRadiusFromPolyline(poly, center)
}


// Axis-aware ring metrics from arbitrary point list, measured in the plane
// perpendicular to the provided axis direction.
// points: Array of [x,y,z] or { p:[x,y,z] }
// center: THREE.Vector3 or [x,y,z]
// axisDir: THREE.Vector3 or [x,y,z]
export function ringMetricsAlongAxisFromPoints(points, center, axisDir) {
  if (!Array.isArray(points) || points.length === 0) return { radius: 0, circumference: 0 }
  const c = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const n = Array.isArray(axisDir) ? new THREE.Vector3(axisDir[0], axisDir[1], axisDir[2]) : axisDir.clone()
  if (n.lengthSq() < 1e-12) n.set(0, 1, 0)
  n.normalize()
  let sumR = 0
  let cnt = 0
  for (const entry of points) {
    const p = Array.isArray(entry) ? entry : (entry && entry.p)
    if (!Array.isArray(p) || p.length !== 3) continue
    const P = new THREE.Vector3(p[0], p[1], p[2])
    const v = P.sub(c)
    const radial = v.clone().sub(n.clone().multiplyScalar(v.dot(n)))
    sumR += radial.length()
    cnt++
  }
  const radius = cnt ? (sumR / cnt) : 0
  return { radius, circumference: 2 * Math.PI * radius }
}

