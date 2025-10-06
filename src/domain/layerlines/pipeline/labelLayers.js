import * as THREE from 'three'

function getPolylineMid(poly) {
  if (!poly || poly.length === 0) return null
  const m = poly[Math.floor(poly.length / 2)]
  return new THREE.Vector3(m[0], m[1], m[2])
}

function sortLayersByKey(layers) {
  const copy = [...layers]
  if (copy.length <= 1) return copy
  const eps = 1e-6
  const keys = copy.map(l => (l._keyAlongAxis ?? l.y ?? 0))
  const minKey = Math.min(...keys)
  const maxKey = Math.max(...keys)
  // Helper: approximate perimeter to order concentric rings on a flat face
  const perimeter = (layer) => {
    try {
      const poly = layer?.polylines?.[0]
      if (!Array.isArray(poly) || poly.length < 2) return 0
      let sum = 0
      for (let i = 0; i < poly.length - 1; i++) {
        const ax = poly[i][0], ay = poly[i][1], az = poly[i][2]
        const bx = poly[i + 1][0], by = poly[i + 1][1], bz = poly[i + 1][2]
        const dx = ax - bx, dy = ay - by, dz = az - bz
        sum += Math.sqrt(dx * dx + dy * dy + dz * dz)
      }
      return sum
    } catch (_) { return 0 }
  }
  copy.sort((a, b) => {
    const ka = (a._keyAlongAxis ?? a.y ?? 0)
    const kb = (b._keyAlongAxis ?? b.y ?? 0)
    const dk = ka - kb
    if (Math.abs(dk) > eps) return dk
    const aOnMin = Math.abs(ka - minKey) <= eps
    const bOnMin = Math.abs(kb - minKey) <= eps
    const aOnMax = Math.abs(ka - maxKey) <= eps
    const bOnMax = Math.abs(kb - maxKey) <= eps
    // Only tie-break by perimeter when BOTH are on the same extreme plane
    if (aOnMin && bOnMin) return perimeter(a) - perimeter(b) || 0
    if (aOnMax && bOnMax) return perimeter(b) - perimeter(a) || 0
    // Otherwise preserve input stability
    return 0
  })
  return copy
}

function findObjectPoles(markers, objectId) {
  const list = []
  for (const e of (markers?.poles || [])) {
    const pos = Array.isArray(e) ? e : e?.p
    const role = Array.isArray(e) ? undefined : e?.role
    const oid = Array.isArray(e) ? undefined : e?.objectId
    if (pos && (!objectId || oid === objectId)) list.push({ p: pos, role })
  }
  const start = list.find(e => e.role === 'start')?.p || null
  const end = list.find(e => e.role === 'end')?.p || null
  return { start, end }
}

// Label layers for a single object: sIndex (0..n-1 from start pole), eIndex, t01
function labelGroup(layers, startPos, endPos) {
  const sorted = sortLayersByKey(layers)
  if (sorted.length === 0) return []

  // Determine orientation using proximity of first/last to start pole
  let ascendingIsStartToEnd = true
  if (startPos && endPos) {
    const sV = new THREE.Vector3(startPos[0], startPos[1], startPos[2])
    const firstMid = getPolylineMid(sorted[0].polylines?.[0])
    const lastMid = getPolylineMid(sorted[sorted.length - 1].polylines?.[0])
    if (firstMid && lastMid) {
      const dFirst = firstMid.distanceToSquared(sV)
      const dLast = lastMid.distanceToSquared(sV)
      ascendingIsStartToEnd = dFirst <= dLast
    }
  }

  const ordered = ascendingIsStartToEnd ? sorted : [...sorted].reverse()
  const n = ordered.length
  const out = []
  for (let i = 0; i < n; i++) {
    const base = ordered[i]
    const sIndex = i
    const eIndex = (n - 1) - i
    const t01 = n > 1 ? i / (n - 1) : 0
    out.push({ ...base, sIndex, eIndex, t01 })
  }
  return out
}

// Public API: label layers for all objects present in 'layers', using markers to locate poles
// Returns an array mirroring input layers, enriched with sIndex/eIndex/t01, and per-object meta
export function labelLayersFromPoles(layers, markers) {
  if (!Array.isArray(layers) || layers.length === 0) return { layers: [], meta: {} }
  const byObj = new Map()
  for (const l of layers) {
    const id = l.objectId ?? 'unknown'
    if (!byObj.has(id)) byObj.set(id, [])
    byObj.get(id).push(l)
  }
  const labeled = []
  const meta = {}
  for (const [objectId, group] of byObj.entries()) {
    const poles = findObjectPoles(markers, objectId)
    const groupLabeled = labelGroup(group, poles.start, poles.end)
    labeled.push(...groupLabeled)
    meta[objectId] = {
      count: groupLabeled.length,
      hasStart: !!poles.start,
      hasEnd: !!poles.end,
    }
  }
  return { layers: labeled, meta }
}


