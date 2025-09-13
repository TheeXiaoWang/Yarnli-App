import * as THREE from 'three'
import { intersectWithPlane, nearestPointOnPolyline } from '../../../ui/editor/measurements/utils'

export function buildScaffoldSegmentsToLayer(currentNodes, nextLayer, center, normal) {
  if (!currentNodes || !Array.isArray(currentNodes.nodes) || !nextLayer) return []
  const poly = nextLayer?.polylines?.[0]
  if (!Array.isArray(poly) || poly.length < 2) return []
  const c = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : (center.clone ? center.clone() : new THREE.Vector3(0,0,0))
  const n = Array.isArray(normal) ? new THREE.Vector3(normal[0], normal[1], normal[2]) : (normal.clone ? normal.clone() : new THREE.Vector3(0,1,0))
  const segs = []
  for (const node of currentNodes.nodes) {
    const p = new THREE.Vector3(node.p[0], node.p[1], node.p[2])
    const dir = p.clone().sub(c)
    dir.y = 0
    if (dir.lengthSq() < 1e-12) dir.set(1,0,0)
    dir.normalize()
    const planeNormal = new THREE.Vector3().crossVectors(n, dir).normalize()
    let q = intersectWithPlane(nextLayer, c, planeNormal, dir, null)
    if (!q) {
      q = nearestPointOnPolyline(nextLayer, p) || p
    }
    segs.push([node.p, [q.x, q.y, q.z]])
  }
  return segs
}

export function snapOnLayerByTheta(layer, center, up, theta) {
  const C = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const n = (Array.isArray(up) ? new THREE.Vector3(up[0], up[1], up[2]) : up.clone()).normalize()
  let u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  const dir = u.clone().multiplyScalar(Math.cos(theta)).add(v.clone().multiplyScalar(Math.sin(theta))).normalize()
  const planeNormal = new THREE.Vector3().crossVectors(n, dir).normalize()
  const hit = intersectWithPlane(layer, C, planeNormal, dir, null)
  if (hit) return hit
  const approx = nearestPointOnPolyline(layer, C.clone().add(dir))
  return approx || C
}

export function monotonicBuckets(curN, nxtN, maxBranchesPerStitch = 1) {
  const buckets = Array.from({ length: curN }, () => [])
  const boundary = []
  for (let j = 0; j <= curN; j++) boundary[j] = Math.round((j * nxtN) / curN)
  for (let j = 0; j < curN; j++) {
    let kStart = boundary[j]
    let kEnd = boundary[j + 1] - 1
    if (kEnd < kStart) continue
    kEnd = Math.min(kStart + maxBranchesPerStitch, kEnd)
    for (let k = kStart; k <= kEnd; k++) buckets[j].push(k)
  }
  return buckets
}

export function enforceStepContinuity(prevSegs, currSegs) {
  if (!Array.isArray(prevSegs) || prevSegs.length === 0) return currSegs
  if (!Array.isArray(currSegs) || currSegs.length === 0) return currSegs
  const prevEnds = prevSegs.map((s) => s[1])
  const used = new Array(prevEnds.length).fill(false)
  const adjusted = []
  for (let i = 0; i < currSegs.length; i++) {
    const start = currSegs[i][0]
    let best = -1
    let bestD2 = Infinity
    for (let j = 0; j < prevEnds.length; j++) {
      if (used[j]) continue
      const e = prevEnds[j]
      const dx = start[0] - e[0]
      const dy = start[1] - e[1]
      const dz = start[2] - e[2]
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < bestD2) { bestD2 = d2; best = j }
    }
    if (best >= 0) {
      used[best] = true
      adjusted.push([prevEnds[best], currSegs[i][1]])
    } else {
      adjusted.push(currSegs[i])
    }
  }
  return adjusted
}

export function filterInterLayerOnly(segs, minDeltaY = 1e-4) {
  if (!Array.isArray(segs)) return []
  return segs.filter(([a, b]) => Math.abs(a[1] - b[1]) >= minDeltaY)
}


