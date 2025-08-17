import * as THREE from 'three'

export function vec(entry) {
  if (Array.isArray(entry)) return new THREE.Vector3(...entry)
  if (entry?.pos) return new THREE.Vector3(...entry.pos)
  if (entry?.p) return new THREE.Vector3(...entry.p)
  return new THREE.Vector3(0, 0, 0)
}

export function segVector(objectId, label, a, b) {
  const value = a.distanceTo(b)
  return { objectId, label, value, a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] }
}

export function segProjected(objectId, label, a, b, axis) {
  const value = Math.abs(axis.dot(b.clone().sub(a)))
  return { objectId, label, value, a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] }
}

export function nearestPointOnPolyline(layer, refPoint) {
  try {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length < 2 || !refPoint) return null
    const r = refPoint.clone ? refPoint.clone() : new THREE.Vector3(refPoint.x, refPoint.y, refPoint.z)
    let best = null
    let bestD2 = Infinity
    for (let i = 0; i < poly.length - 1; i++) {
      const a = new THREE.Vector3(poly[i][0], poly[i][1], poly[i][2])
      const b = new THREE.Vector3(poly[i + 1][0], poly[i + 1][1], poly[i + 1][2])
      const ab = b.clone().sub(a)
      const t = Math.max(0, Math.min(1, r.clone().sub(a).dot(ab) / Math.max(1e-12, ab.lengthSq())))
      const p = a.clone().add(ab.multiplyScalar(t))
      const d2 = p.distanceToSquared(r)
      if (d2 < bestD2) {
        bestD2 = d2
        best = p
      }
    }
    return best
  } catch (_) {
    return null
  }
}

export function intersectWithPlane(layer, planePoint, planeNormal, tieBreakerDir, preferNear = null) {
  try {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length < 2) return null
    if (!planePoint || !planeNormal) return null
    const n = planeNormal.clone().normalize()
    const p0 = planePoint.clone ? planePoint.clone() : new THREE.Vector3(planePoint.x, planePoint.y, planePoint.z)
    const points = []
    for (let i = 0; i < poly.length - 1; i++) {
      const a = new THREE.Vector3(poly[i][0], poly[i][1], poly[i][2])
      const b = new THREE.Vector3(poly[i + 1][0], poly[i + 1][1], poly[i + 1][2])
      const da = n.dot(a.clone().sub(p0))
      const db = n.dot(b.clone().sub(p0))
      if (da === 0 && db === 0) continue
      if (da === 0) {
        points.push(a)
        continue
      }
      if (db === 0) {
        points.push(b)
        continue
      }
      if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const t = da / (da - db)
        const x = a.clone().lerp(b, t)
        points.push(x)
      }
    }
    if (points.length === 0) return null
    if (points.length === 1) return points[0]
    if (preferNear) {
      let best = points[0]
      let bestD = Infinity
      const ref = preferNear.clone ? preferNear.clone() : new THREE.Vector3(preferNear.x, preferNear.y, preferNear.z)
      for (const p of points) {
        const d = p.distanceTo(ref)
        if (d < bestD) {
          bestD = d
          best = p
        }
      }
      return best
    }
    if (tieBreakerDir) {
      let best = points[0]
      let bestS = -Infinity
      const tb = tieBreakerDir.clone ? tieBreakerDir.clone() : new THREE.Vector3(tieBreakerDir.x, tieBreakerDir.y, tieBreakerDir.z)
      for (const p of points) {
        const s = p.dot(tb)
        if (s > bestS) {
          bestS = s
          best = p
        }
      }
      return best
    }
    return points[0]
  } catch (_) {
    return null
  }
}


