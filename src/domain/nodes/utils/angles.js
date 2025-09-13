import * as THREE from 'three'

export function normalizeAngle(a) {
  const twoPi = Math.PI * 2
  while (a < 0) a += twoPi
  while (a >= twoPi) a -= twoPi
  return a
}

export function computeOrderedAngles(points, center) {
  const C = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const arr = points.map((p, idx) => {
    const v = new THREE.Vector3(p[0]-C.x, 0, p[2]-C.z)
    const theta = Math.atan2(v.z, v.x)
    return { idx, theta: normalizeAngle(theta), p }
  })
  arr.sort((a, b) => a.theta - b.theta)
  return arr
}

export function angleSpan(a, b) {
  let d = b - a
  const twoPi = Math.PI * 2
  if (d < 0) d += twoPi
  return d
}

export function angleOfPoint(p, center) {
  const C = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const v = new THREE.Vector3(p[0]-C.x, 0, p[2]-C.z)
  return normalizeAngle(Math.atan2(v.z, v.x))
}

export function rotateArray(arr, offset) {
  if (!Array.isArray(arr) || arr.length === 0) return arr
  const n = arr.length
  const k = ((offset % n) + n) % n
  if (k === 0) return arr
  return arr.slice(k).concat(arr.slice(0, k))
}

// Align next ring ordering so its first element is at similar azimuth to current[0]
// Keeps ordering, only rotates starting index.
export function alignRingByAzimuth(currentPoints, nextPoints, center) {
  if (!Array.isArray(currentPoints) || currentPoints.length === 0) return nextPoints
  if (!Array.isArray(nextPoints) || nextPoints.length === 0) return nextPoints
  const theta0 = angleOfPoint(Array.isArray(currentPoints[0]) ? currentPoints[0] : currentPoints[0].p, center)
  let bestK = 0
  let bestD = Infinity
  for (let k = 0; k < nextPoints.length; k++) {
    const p = Array.isArray(nextPoints[k]) ? nextPoints[k] : nextPoints[k].p
    const th = angleOfPoint(p, center)
    let d = Math.abs(th - theta0)
    if (d > Math.PI) d = 2*Math.PI - d
    if (d < bestD) { bestD = d; bestK = k }
  }
  return rotateArray(nextPoints, bestK)
}


