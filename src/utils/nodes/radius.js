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


