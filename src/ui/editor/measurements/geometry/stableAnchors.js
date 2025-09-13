import * as THREE from 'three'
import { nearestPointOnPolyline, intersectWithPlane } from './anchors'

function centroidOf(layer) {
  const poly = layer?.polylines?.[0]
  if (!poly || poly.length === 0) return null
  const c = new THREE.Vector3()
  for (const p of poly) c.add(new THREE.Vector3(p[0], p[1], p[2]))
  return c.multiplyScalar(1 / poly.length)
}

export function buildFacingFrame(axis, firstLayer, startPole) {
  const ax = axis.clone().normalize()
  const c0 = centroidOf(firstLayer) || startPole.clone()
  const toward = c0.clone().sub(startPole)
  const proj = toward.clone().sub(ax.clone().multiplyScalar(toward.dot(ax)))
  let dirFace
  if (proj.lengthSq() < 1e-10) {
    // Degenerate: pick any stable perpendicular
    let up = new THREE.Vector3(0, 1, 0)
    if (Math.abs(up.dot(ax)) > 0.9) up = new THREE.Vector3(1, 0, 0)
    dirFace = up.clone().sub(ax.clone().multiplyScalar(up.dot(ax))).normalize()
  } else {
    dirFace = proj.normalize()
  }
  const planeNormal = new THREE.Vector3().crossVectors(ax, dirFace).normalize()
  return { axis: ax, dirFace, planeNormal, startPole }
}

// Robust fixed-plane anchor: choose intersection with max projection along facing dir;
// if no intersection, choose vertex with max projection along facing dir.
export function pickStableAnchor(layer, frame, _prevAnchor = null, _opts = {}) {
  const poly = layer?.polylines?.[0]
  if (!poly || poly.length < 2) return null
  const n = frame.planeNormal
  const p0 = frame.startPole
  const dir = frame.dirFace
  const points = []
  for (let i = 0; i < poly.length - 1; i++) {
    const a = new THREE.Vector3(poly[i][0], poly[i][1], poly[i][2])
    const b = new THREE.Vector3(poly[i + 1][0], poly[i + 1][1], poly[i + 1][2])
    const da = n.dot(a.clone().sub(p0))
    const db = n.dot(b.clone().sub(p0))
    if (da === 0 && db === 0) continue
    if (da === 0) { points.push(a); continue }
    if (db === 0) { points.push(b); continue }
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const t = da / (da - db)
      const x = a.clone().lerp(b, t)
      points.push(x)
    }
  }
  if (points.length > 0) {
    if (_prevAnchor) {
      let best = points[0]
      let bestD = Infinity
      for (const p of points) {
        const d = p.distanceTo(_prevAnchor)
        if (d < bestD) { bestD = d; best = p }
      }
      return best
    } else {
      let best = points[0]
      let bestS = -Infinity
      for (const p of points) {
        const s = p.clone().sub(p0).dot(dir)
        if (s > bestS) { bestS = s; best = p }
      }
      return best
    }
  }
  // Fallback: pick vertex with max projection along facing dir
  let best = null
  let bestS = -Infinity
  for (const v of poly) {
    const p = new THREE.Vector3(v[0], v[1], v[2])
    const s = p.clone().sub(p0).dot(dir)
    if (s > bestS) { bestS = s; best = p }
  }
  return best
}


