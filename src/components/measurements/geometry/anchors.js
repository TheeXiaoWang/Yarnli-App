import * as THREE from 'three'

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
      if (d2 < bestD2) { bestD2 = d2; best = p }
    }
    return best
  } catch (_) { return null }
}

export function intersectWithPlane(layer, planePoint, planeNormal, tieBreakerDir, preferNear = null) {
  try {
    const poly = layer?.polylines?.[0]
    if (!poly || poly.length < 2) return null
    if (!planePoint || !planeNormal) return null
    const n = planeNormal.clone().normalize()
    const p0 = planePoint.clone ? planePoint.clone() : new THREE.Vector3(planePoint.x, planePoint.y, planePoint.z)
    const points = []
    const eps = 1e-5
    for (let i = 0; i < poly.length - 1; i++) {
      const a = new THREE.Vector3(poly[i][0], poly[i][1], poly[i][2])
      const b = new THREE.Vector3(poly[i + 1][0], poly[i + 1][1], poly[i + 1][2])
      const da = n.dot(a.clone().sub(p0))
      const db = n.dot(b.clone().sub(p0))
      if (Math.abs(da) < eps && Math.abs(db) < eps) { points.push(a); points.push(b); continue }
      if (Math.abs(da) < eps) { points.push(a); continue }
      if (Math.abs(db) < eps) { points.push(b); continue }
      if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const t = da / (da - db)
        const x = a.clone().lerp(b, t)
        points.push(x)
      }
    }
    if (points.length === 0) {
      // Fallback: choose vertex with minimum |signed distance|; tie-break by azimuth direction
      let best = null
      let bestAbs = Infinity
      for (let i = 0; i < poly.length; i++) {
        const p = new THREE.Vector3(poly[i][0], poly[i][1], poly[i][2])
        const d = Math.abs(n.dot(p.clone().sub(p0)))
        if (d < bestAbs) { bestAbs = d; best = p }
      }
      if (!best) return null
      if (tieBreakerDir) {
        // shift slightly along tieBreakerDir to stay consistent across rings
        const tb = tieBreakerDir.clone ? tieBreakerDir.clone() : new THREE.Vector3(tieBreakerDir.x, tieBreakerDir.y, tieBreakerDir.z)
        best = best.clone().add(tb.clone().multiplyScalar(0.0))
      }
      return best
    }
    if (points.length === 1) return points[0]
    if (preferNear) {
      let best = points[0]
      let bestD = Infinity
      const ref = preferNear.clone ? preferNear.clone() : new THREE.Vector3(preferNear.x, preferNear.y, preferNear.z)
      for (const p of points) {
        const d = p.distanceTo(ref)
        if (d < bestD) { bestD = d; best = p }
      }
      return best
    }
    if (tieBreakerDir) {
      let best = points[0]
      let bestS = -Infinity
      const tb = tieBreakerDir.clone ? tieBreakerDir.clone() : new THREE.Vector3(tieBreakerDir.x, tieBreakerDir.y, tieBreakerDir.z)
      for (const p of points) {
        const s = p.dot(tb)
        if (s > bestS) { bestS = s; best = p }
      }
      return best
    }
    return points[0]
  } catch (_) { return null }
}

export function makeAzimuthFrame(axis, azimuthDeg) {
  if (!Number.isFinite(azimuthDeg)) return { useFixed: false, planeNormal: null, azimuthDir: null }
  try {
    const angle = (azimuthDeg || 0) * Math.PI / 180
    let upHint = new THREE.Vector3(0, 1, 0)
    if (Math.abs(upHint.dot(axis)) > 0.9) upHint = new THREE.Vector3(1, 0, 0)
    const u = upHint.clone().sub(axis.clone().multiplyScalar(upHint.dot(axis))).normalize()
    const v = new THREE.Vector3().crossVectors(axis, u).normalize()
    const azimuthDir = u.clone().multiplyScalar(Math.cos(angle)).add(v.clone().multiplyScalar(Math.sin(angle)))
    const planeNormal = new THREE.Vector3().crossVectors(axis, azimuthDir).normalize()
    return { useFixed: true, planeNormal, azimuthDir }
  } catch (_) {
    return { useFixed: false, planeNormal: null, azimuthDir: null }
  }
}

// Builds an azimuth frame derived from the geometry of the first ring and the start pole.
// This locks the selection to the side of the object that faces the start pole, improving sideways stability.
export function makeAzimuthFrameFromRing(axis, ringLayer, startPole) {
  try {
    const poly = ringLayer?.polylines?.[0]
    if (!poly || poly.length === 0 || !startPole) return makeAzimuthFrame(axis, 0)
    const centroid = poly.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).multiplyScalar(1 / poly.length)
    const toward = new THREE.Vector3().subVectors(centroid, startPole)
    // Project toward onto plane perpendicular to axis
    const proj = toward.clone().sub(axis.clone().multiplyScalar(toward.dot(axis)))
    if (proj.lengthSq() < 1e-8) return makeAzimuthFrame(axis, 0)
    const azimuthDir = proj.normalize()
    const planeNormal = new THREE.Vector3().crossVectors(axis, azimuthDir).normalize()
    return { useFixed: true, planeNormal, azimuthDir }
  } catch (_) {
    return makeAzimuthFrame(axis, 0)
  }
}


