import * as THREE from 'three'

export const isClosed = (poly) => (
  Array.isArray(poly) && poly.length > 2 &&
  poly[0][0] === poly[poly.length - 1][0] &&
  poly[0][1] === poly[poly.length - 1][1] &&
  poly[0][2] === poly[poly.length - 1][2]
)

export const nearestOnPolyline = (poly, P) => {
  let bestD2 = Infinity
  let bestS = 0
  let acc = 0
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1]
    const ax = a[0], ay = a[1], az = a[2]
    const bx = b[0], by = b[1], bz = b[2]
    const vx = bx - ax, vy = by - ay, vz = bz - az
    const wx = P.x - ax, wy = P.y - ay, wz = P.z - az
    const vv = Math.max(1e-12, vx * vx + vy * vy + vz * vz)
    let t = (wx * vx + wy * vy + wz * vz) / vv
    t = Math.max(0, Math.min(1, t))
    const px = ax + vx * t, py = ay + vy * t, pz = az + vz * t
    const dx = P.x - px, dy = P.y - py, dz = P.z - pz
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 < bestD2) { bestD2 = d2; bestS = acc + Math.sqrt(vv) * t }
    acc += Math.sqrt(vv)
  }
  return { d2: bestD2, s: bestS }
}

export const nearestPolylineId = (pt, arcs) => {
  const P = new THREE.Vector3(pt[0], pt[1], pt[2])
  let best = 0, bestD2 = Infinity
  for (let i = 0; i < arcs.length; i++) {
    const { d2 } = nearestOnPolyline(arcs[i], P)
    if (d2 < bestD2) { bestD2 = d2; best = i }
  }
  return best
}


