import * as THREE from 'three'

// Compute per-object layer ordering and colors consistent with the LayerlineViewer overlay.
// - layers: array of layer objects { polylines, objectId, _keyAlongAxis?, y?, ... }
// - markers: { poles: [ [x,y,z] | { p:[x,y,z], role, objectId }, ... ] }
// Returns: { idxMap: WeakMap<layer, number>, colorMap: Map<objectId, string> }
export function computePerObjectLayerOrder(layers, markers) {
  const isRenderable = (l) => !l.isConnector && !l.isLadder && !l.isTipChain && !l.isEdgeArc && !l.isOffset && !l.isIntersection && !l.isCutEdge

  const idxMap = new WeakMap()
  const colorMap = new Map()
  const groups = new Map()

  const hashColor = (id) => {
    const s = String(id ?? 'unknown')
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
    return `hsl(${h},70%,60%)`
  }

  // Gather poles by object
  const polesByObj = new Map()
  for (const p of (markers?.poles || [])) {
    const oid = p?.objectId ?? 'unknown'
    if (!polesByObj.has(oid)) polesByObj.set(oid, {})
    const pos = Array.isArray(p) ? p : p?.p
    if (p.role === 'start' && Array.isArray(pos)) polesByObj.get(oid).start = pos
    else if (p.role === 'end' && Array.isArray(pos)) polesByObj.get(oid).end = pos
  }

  // Group layers per object (skip helpers)
  for (const l of (layers || [])) {
    if (!isRenderable(l)) continue
    const oid = l.objectId ?? 'unknown'
    if (!groups.has(oid)) groups.set(oid, [])
    groups.get(oid).push(l)
    if (!colorMap.has(oid)) colorMap.set(oid, hashColor(oid))
  }

  // For each object, sort from start pole → end pole and assign indices
  groups.forEach((arr, oid) => {
    const poles = polesByObj.get(oid) || {}
    let n = null, origin = null
    if (Array.isArray(poles.start) && Array.isArray(poles.end)) {
      origin = new THREE.Vector3(poles.start[0], poles.start[1], poles.start[2])
      const endV = new THREE.Vector3(poles.end[0], poles.end[1], poles.end[2])
      n = endV.clone().sub(origin)
      if (n.lengthSq() > 1e-12) n.normalize(); else n = null
    }

    const keyFor = (layer) => {
      try {
        if (n && origin) {
          const poly = layer?.polylines?.[0]
          if (Array.isArray(poly) && poly.length > 0) {
            const m = poly[Math.floor(poly.length / 2)]
            if (Array.isArray(m)) {
              const v = new THREE.Vector3(m[0], m[1], m[2])
              return n.dot(v.clone().sub(origin))
            }
          }
        }
      } catch (_) {}
      return (layer._keyAlongAxis != null) ? layer._keyAlongAxis : (layer.y ?? 0)
    }

    // Pre-compute keys for tie-breakers including base faces
    const keys = arr.map((a) => {
      try {
        if (n && origin) {
          const poly = a?.polylines?.[0]
          if (Array.isArray(poly) && poly.length > 0) {
            const m = poly[Math.floor(poly.length / 2)]
            if (Array.isArray(m)) {
              const v = new THREE.Vector3(m[0], m[1], m[2])
              return n.dot(v.clone().sub(origin))
            }
          }
        }
      } catch (_) {}
      return (a._keyAlongAxis != null) ? a._keyAlongAxis : (a.y ?? 0)
    })
    const minKey = Math.min(...keys)
    const maxKey = Math.max(...keys)
    const eps = 1e-6
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

    // Base sort by key, then refined with extreme-plane tie-breakers
    arr.sort((a, b) => keyFor(a) - keyFor(b))
    arr.sort((a, b) => {
      const ka = keyFor(a)
      const kb = keyFor(b)
      const dk = ka - kb
      if (Math.abs(dk) > eps) return dk
      const aOnMin = Math.abs(ka - minKey) <= eps
      const bOnMin = Math.abs(kb - minKey) <= eps
      const aOnMax = Math.abs(ka - maxKey) <= eps
      const bOnMax = Math.abs(kb - maxKey) <= eps
      if (aOnMin && bOnMin) return perimeter(a) - perimeter(b) // inner→outer
      if (aOnMax && bOnMax) return perimeter(b) - perimeter(a) // outer→inner
      return 0
    })

    for (let i = 0; i < arr.length; i++) idxMap.set(arr[i], i)
  })

  return { idxMap, colorMap }
}

