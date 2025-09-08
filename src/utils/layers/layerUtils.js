import * as THREE from 'three'

export function findLayerBelow(layers, yCurrent) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let best = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    if (y >= yCurrent) continue
    const dy = yCurrent - y
    if (dy < bestDy) { bestDy = dy; best = l }
  }
  return best
}

export function findLayerAtLeastBelow(layers, yCurrent, minDeltaY) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let candidate = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    if (y > yCurrent - minDeltaY) continue
    const dy = yCurrent - y
    if (dy < bestDy) { bestDy = dy; candidate = l }
  }
  return candidate || findLayerBelow(layers, yCurrent)
}

export function findImmediateLayerBelow(layers, yCurrent) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  const eps = 1e-6
  let best = null
  let minDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    const dy = yCurrent - y
    if (dy > eps && dy < minDy) { minDy = dy; best = l }
  }
  return best
}

export function pickRingClosestToPoint(layers, point) {
  if (!Array.isArray(layers) || layers.length === 0 || !point) return null
  let best = null
  let bestD = Infinity
  for (const l of layers) {
    const poly = l?.polylines?.[0]
    if (!poly || poly.length === 0) continue
    const mid = poly[Math.floor(poly.length / 2)]
    const v = new THREE.Vector3(mid[0], mid[1], mid[2])
    const d = v.distanceTo(point)
    if (d < bestD) { bestD = d; best = { poly, layer: l } }
  }
  return best
}

export function pickNextRingByDistance(layers, point, firstPoly) {
  if (!Array.isArray(layers) || layers.length === 0 || !point) return null
  const entries = []
  for (const l of layers) {
    const poly = l?.polylines?.[0]
    if (!poly || poly.length === 0) continue
    const mid = poly[Math.floor(poly.length / 2)]
    const v = new THREE.Vector3(mid[0], mid[1], mid[2])
    const d = v.distanceTo(point)
    entries.push({ d, poly, layer: l })
  }
  entries.sort((a, b) => a.d - b.d)
  if (entries.length < 2) return null
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.poly !== firstPoly) return e
  }
  return entries[1] || null
}

export function getFirstLayerRing(layers, startCenter) {
  if (!Array.isArray(layers) || layers.length === 0 || !startCenter) return null
  const closestRing = pickRingClosestToPoint(layers, startCenter)
  if (closestRing && closestRing.poly && closestRing.poly.length >= 3) {
    return closestRing.poly
  }
  for (const layer of layers) {
    const poly = layer?.polylines?.[0]
    if (poly && poly.length >= 3) {
      return poly
    }
  }
  return null
}

export function deriveStartAndNormal(markers) {
  let start = null
  let end = null
  const poles = markers?.poles || []
  for (const entry of poles) {
    if (Array.isArray(entry)) {
      if (!start) start = new THREE.Vector3(entry[0], entry[1], entry[2])
      else if (!end) end = new THREE.Vector3(entry[0], entry[1], entry[2])
    } else if (entry && entry.p) {
      const v = new THREE.Vector3(entry.p[0], entry.p[1], entry.p[2])
      if (entry.role === 'start') start = v
      else if (entry.role === 'end') end = v
      else if (!start) start = v
      else if (!end) end = v
    }
  }
  if (!start) start = new THREE.Vector3(0, 0, 0)
  let normal = new THREE.Vector3(0, 1, 0)
  if (end) {
    normal = new THREE.Vector3().subVectors(end, start)
    if (normal.lengthSq() < 1e-12) normal.set(0, 1, 0)
    normal.normalize()
  }
  return { startCenter: start, endCenter: end, ringPlaneNormal: normal }
}

export function orderLayersAlongAxis(layers, axisOrigin, axisDir) {
  if (!Array.isArray(layers)) return []
  const ax = axisDir.clone ? axisDir.clone() : new THREE.Vector3(axisDir[0], axisDir[1], axisDir[2])
  if (ax.lengthSq() < 1e-12) ax.set(0,1,0)
  ax.normalize()
  const origin = axisOrigin.clone ? axisOrigin.clone() : new THREE.Vector3(axisOrigin[0], axisOrigin[1], axisOrigin[2])
  return layers
    .map((l) => {
      const poly = l?.polylines?.[0]
      let mid = null
      if (Array.isArray(poly) && poly.length > 0) mid = poly[Math.floor(poly.length / 2)]
      const v = mid ? new THREE.Vector3(mid[0], mid[1], mid[2]) : new THREE.Vector3(0, 0, 0)
      const key = ax.dot(v.clone().sub(origin))
      return { layer: l, __key: key }
    })
    .filter(e => Number.isFinite(e.__key))
    .sort((a, b) => a.__key - b.__key)
    .map(e => e.layer)
}


