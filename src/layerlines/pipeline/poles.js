import * as THREE from 'three'

function midOfPolyline(poly) {
  if (!Array.isArray(poly) || poly.length === 0) return null
  const m = poly[Math.floor(poly.length / 2)]
  return new THREE.Vector3(m[0], m[1], m[2])
}

function normalizePoles(poles) {
  const out = []
  for (const e of (poles || [])) {
    if (Array.isArray(e)) { out.push({ p: e, role: e.role }) }
    else if (e && Array.isArray(e.p)) { out.push({ p: e.p, role: e.role }) }
  }
  return out
}

export function determinePoleRoles(layers, markersPoles) {
  const poles = normalizePoles(markersPoles)
  if (poles.length < 1) return { poles: [] }

  // If roles already present for at least one pole, honor them
  const hasRoles = poles.some(p => p.role === 'start' || p.role === 'end')
  if (hasRoles && poles.length >= 2) {
    // Ensure both roles are assigned if only one missing
    const startIdx = poles.findIndex(p => p.role === 'start')
    const endIdx = poles.findIndex(p => p.role === 'end')
    if (startIdx >= 0 && endIdx < 0) {
      const other = poles.findIndex((_, i) => i !== startIdx)
      if (other >= 0) poles[other].role = 'end'
    } else if (endIdx >= 0 && startIdx < 0) {
      const other = poles.findIndex((_, i) => i !== endIdx)
      if (other >= 0) poles[other].role = 'start'
    }
    return { poles }
  }

  // Compute first/last ring midpoints along available keys
  let firstMid = null
  let lastMid = null
  if (Array.isArray(layers) && layers.length > 0) {
    // pick min/max by _keyAlongAxis when available; else by y
    const sorted = [...layers].sort((a,b)=>{
      const ka=(a._keyAlongAxis??a.y??0); const kb=(b._keyAlongAxis??b.y??0); return ka-kb
    })
    firstMid = midOfPolyline(sorted[0]?.polylines?.[0])
    lastMid = midOfPolyline(sorted[sorted.length-1]?.polylines?.[0])
  }

  if (poles.length === 1) {
    // Single pole; label as start by default
    poles[0].role = 'start'
    return { poles }
  }

  if (poles.length >= 2) {
    // Choose the two farthest poles (for safety if more than 2)
    let bestI = 0, bestJ = 1, bestD = -Infinity
    for (let i=0;i<poles.length;i++) for (let j=i+1;j<poles.length;j++) {
      const a = new THREE.Vector3(poles[i].p[0], poles[i].p[1], poles[i].p[2])
      const b = new THREE.Vector3(poles[j].p[0], poles[j].p[1], poles[j].p[2])
      const d = a.distanceToSquared(b)
      if (d>bestD) { bestD=d; bestI=i; bestJ=j }
    }
    const pA = new THREE.Vector3(poles[bestI].p[0], poles[bestI].p[1], poles[bestI].p[2])
    const pB = new THREE.Vector3(poles[bestJ].p[0], poles[bestJ].p[1], poles[bestJ].p[2])

    // Default orientation by proximity to first/last ring midpoints
    if (firstMid && lastMid) {
      const dAf = pA.distanceToSquared(firstMid)
      const dBf = pB.distanceToSquared(firstMid)
      if (dAf <= dBf) {
        poles[bestI].role = 'start'; poles[bestJ].role = 'end'
      } else {
        poles[bestJ].role = 'start'; poles[bestI].role = 'end'
      }
    } else {
      // Fallback: assign arbitrarily but consistently
      poles[bestI].role = 'start'; poles[bestJ].role = 'end'
    }
    // Clear roles on any extra poles if present
    for (let k=0;k<poles.length;k++) if (k!==bestI && k!==bestJ) delete poles[k].role
    return { poles }
  }

  return { poles }
}


