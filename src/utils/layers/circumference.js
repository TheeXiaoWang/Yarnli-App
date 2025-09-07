import * as THREE from 'three'

/** Sum the 3D length of a polyline. If closed==true, includes last→first. */
export function polylineLength3D(poly, closed = true) {
  if (!Array.isArray(poly) || poly.length < 2) return 0
  let L = 0
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1]
    L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  if (closed) {
    const a = poly[poly.length - 1], b = poly[0]
    L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  return L
}

/** Optional: same length after projecting onto the plane ⟂ axis (for noisy data). */
export function polylineLengthProjected(poly, center, axis, closed = true) {
  if (!Array.isArray(poly) || poly.length < 2) return 0
  const n = new THREE.Vector3(...axis).normalize()
  const C = new THREE.Vector3(...center)
  const proj = poly.map((p) => {
    const P = new THREE.Vector3(...p).sub(C)
    const radial = P.sub(n.clone().multiplyScalar(P.dot(n)))
    return [radial.x, radial.y, radial.z]
  })
  return polylineLength3D(proj, closed)
}

/** Return `count` points evenly spaced by arc length along the polyline. */
export function resamplePolylineByArcLength(poly, count, closed = true) {
  if (!Array.isArray(poly) || poly.length === 0 || count <= 0) return []
  const pts = poly.slice()
  if (closed && (pts.length < 2 || (pts[0][0] !== pts[pts.length-1][0] || pts[0][1] !== pts[pts.length-1][1] || pts[0][2] !== pts[pts.length-1][2]))) {
    pts.push([pts[0][0], pts[0][1], pts[0][2]])
  }
  // cumulative lengths
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i-1], b = pts[i]
    const d = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2])
    cum.push(cum[cum.length-1] + d)
  }
  const total = cum[cum.length-1]
  if (total <= 1e-9) return Array.from({ length: count }, () => pts[0].slice())
  const step = total / count
  const out = []
  for (let k = 0; k < count; k++) {
    const target = k * step
    // find segment containing target
    let i = 1
    while (i < cum.length && cum[i] < target) i++
    const i0 = Math.max(0, i - 1)
    const i1 = Math.min(pts.length - 1, i)
    const a = pts[i0], b = pts[i1]
    const segLen = Math.max(1e-9, cum[i1] - cum[i0])
    const t = Math.max(0, Math.min(1, (target - cum[i0]) / segLen))
    out.push([
      a[0] + (b[0]-a[0]) * t,
      a[1] + (b[1]-a[1]) * t,
      a[2] + (b[2]-a[2]) * t,
    ])
  }
  return out
}


