import * as THREE from 'three'
import { labelLayersFromPoles } from '../../../layerlines/pipeline/index.js'

// Kindergarten-simple measurement: put a dot on every ring and both poles,
// then connect them in order from start pole to end pole.
// Options:
// - azimuthDeg: angle around axis to place dots
// - projectAlongAxis: compute projected lengths (true for non-spheres), or 3D lengths
export function computeMeasurementsV2(layers, markers, opts = {}) {
  const { azimuthDeg = 0, projectAlongAxis = undefined, targetSpacing = null, tolerance = null, firstSpacingAtLeast = null } = opts
  const labeled = labelLayersFromPoles(layers || [], markers || {})
  const perObject = new Map()
  for (const layer of labeled.layers) {
    const id = layer.objectId ?? 'unknown'
    if (!perObject.has(id)) perObject.set(id, [])
    perObject.get(id).push(layer)
  }

  const polesByObject = new Map()
  if (markers?.poles) {
    for (const e of markers.poles) {
      const pos = Array.isArray(e) ? e : (e?.p || e?.pos)
      const id = Array.isArray(e) ? 'unknown' : (e?.objectId ?? 'unknown')
      const role = Array.isArray(e) ? undefined : e?.role
      if (!polesByObject.has(id)) polesByObject.set(id, [])
      polesByObject.get(id).push({ pos, role })
    }
  }

  const segments = []
  const dotsAll = []
  perObject.forEach((arr, id) => {
    const type = arr[0]?.objectType || 'unknown'
    const useProjected = (projectAlongAxis !== undefined) ? projectAlongAxis : (type !== 'sphere')
    const poles = polesByObject.get(id) || []
    const start = poles.find(p=>p.role==='start')?.pos || poles[0]?.pos
    const end = poles.find(p=>p.role==='end')?.pos || poles[1]?.pos
    if (!start || !arr.length) return
    const startV = new THREE.Vector3(...start)
    const endV = end ? new THREE.Vector3(...end) : null
    const axis = endV ? endV.clone().sub(startV).normalize() : new THREE.Vector3(0,1,0)
    // Build azimuth basis u,v perp to axis
    let up = new THREE.Vector3(0,1,0)
    if (Math.abs(up.dot(axis)) > 0.9) up = new THREE.Vector3(1,0,0)
    const u = up.clone().sub(axis.clone().multiplyScalar(up.dot(axis))).normalize()
    const v = new THREE.Vector3().crossVectors(axis, u).normalize()
    const a = (azimuthDeg * Math.PI) / 180
    const dir = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a)))

    // dot picker: intersection with plane through the axis at azimuth; choose the side by azimuth dir
    const planeNormal = new THREE.Vector3().crossVectors(axis, dir).normalize()
    const pick = (layer, planePoint) => {
      const poly = layer?.polylines?.[0]
      if (!poly || poly.length < 2) return null
      const p0 = planePoint.clone()
      const n = planeNormal
      let best = null
      let bestScore = -Infinity
      const eps = 1e-6
      const L = poly.length
      const choose = (X) => {
        const v = X.clone().sub(startV)
        const axial = axis.clone().multiplyScalar(v.dot(axis))
        const vPerp = v.clone().sub(axial)
        const score = vPerp.dot(dir)
        if (score > bestScore) { bestScore = score; best = X }
      }
      for (let i = 0; i < L; i++) {
        const A = new THREE.Vector3(...poly[i])
        const B = new THREE.Vector3(...poly[(i+1)%L])
        const da = n.dot(A.clone().sub(p0))
        const db = n.dot(B.clone().sub(p0))
        if (Math.abs(da) < eps && Math.abs(db) < eps) { choose(A); continue }
        if (Math.abs(da) < eps) { choose(A); continue }
        if (Math.abs(db) < eps) { choose(B); continue }
        if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
          const t = da / (da - db)
          choose(A.clone().lerp(B, t))
        }
      }
      if (best) return best
      // Fallback: choose vertex with max azimuth score to ensure every ring gets a dot
      for (let i = 0; i < L; i++) {
        const X = new THREE.Vector3(...poly[i])
        choose(X)
      }
      return best
    }

    const dots = []
    dots.push(startV)
    for (const layer of arr) {
      const p = pick(layer, startV) || pick(layer, endV || startV) || new THREE.Vector3(...layer.polylines[0][0])
      dots.push(p)
    }
    if (endV) dots.push(endV)
    // Record dots for this object
    for (const p of dots) dotsAll.push([p.x,p.y,p.z])

    // Build segments by nearest-neighbor along the axis: sort by projection and connect neighbors
    const orderedIdx = dots.map((p, i) => ({ i, t: axis.dot(p.clone().sub(startV)) }))
      .sort((a, b) => a.t - b.t)
      .map(e => e.i)
    // Optionally enforce a minimum first spacing from the start pole to the first ring
    let startK = 0
    if (Number.isFinite(firstSpacingAtLeast) && firstSpacingAtLeast > 0) {
      const startDot = startV
      for (let idx = 1; idx < orderedIdx.length; idx++) {
        const pt = dots[orderedIdx[idx]]
        const dist = useProjected ? Math.abs(axis.dot(pt.clone().sub(startDot))) : pt.distanceTo(startDot)
        if (dist >= firstSpacingAtLeast) { startK = idx; break }
      }
    }

    for (let k = startK; k < orderedIdx.length - 1; k++) {
      const i = orderedIdx[k]
      const j = orderedIdx[k + 1]
      const A = dots[i]
      const B = dots[j]
      const value = useProjected ? Math.abs(axis.dot(B.clone().sub(A))) : A.distanceTo(B)
      const label = `${i===0?'P':'R'+(i-1)}→${j===dots.length-1?'P':'R'+(j-1)}`
      // Optional strict spacing filter: only keep segments close to target spacing
      if (Number.isFinite(targetSpacing) && targetSpacing > 0) {
        const tol = Number.isFinite(tolerance) ? tolerance : targetSpacing * 0.35
        if (Math.abs(value - targetSpacing) > tol) continue
      }
      segments.push({ objectId: id, label, value, a:[A.x,A.y,A.z], b:[B.x,B.y,B.z] })
    }
  })

  return { segments, dots: dotsAll }
}


