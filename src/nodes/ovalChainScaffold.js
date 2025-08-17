import * as THREE from 'three'

function projectPointToPlane(point, center, normal) {
  const v = point.clone().sub(center)
  const d = v.dot(normal)
  return point.clone().sub(normal.clone().multiplyScalar(d))
}

function buildPlaneBasis(normal, hint) {
  let u = hint ? hint.clone() : new THREE.Vector3(1, 0, 0)
  if (Math.abs(u.dot(normal)) > 0.9) u.set(0, 1, 0)
  u.sub(normal.clone().multiplyScalar(u.dot(normal))).normalize()
  const v = new THREE.Vector3().crossVectors(normal, u)
  return { u, v }
}

function computeCentroid(poly) {
  const c = new THREE.Vector3()
  for (const p of poly) c.add(new THREE.Vector3(p[0], p[1], p[2]))
  c.multiplyScalar(1 / Math.max(1, poly.length))
  return c
}

function nearestDistancePointToPolyline(point, poly) {
  let best = Infinity
  for (let i = 0; i < poly.length - 1; i++) {
    const a = new THREE.Vector3(...poly[i])
    const b = new THREE.Vector3(...poly[i + 1])
    const ab = b.clone().sub(a)
    const t = Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / Math.max(1e-12, ab.lengthSq())))
    const q = a.clone().add(ab.multiplyScalar(t))
    const d = q.distanceTo(point)
    if (d < best) best = d
  }
  return best
}

function solveOffsetForTargetDistance(centerOnPlane, dir, nextRing, target, maxIter = 24) {
  let lo = 0
  let hi = Math.max(target * 4, 1e-3)
  // Expand hi until distance(hi) >= target to ensure bracketing
  for (let i = 0; i < 10; i++) {
    const p = centerOnPlane.clone().add(dir.clone().multiplyScalar(hi))
    const d = nearestDistancePointToPolyline(p, nextRing)
    if (d >= target * 0.95) break
    hi *= 1.8
  }
  let t = hi * 0.5
  for (let it = 0; it < maxIter; it++) {
    const p = centerOnPlane.clone().add(dir.clone().multiplyScalar(t))
    const d = nearestDistancePointToPolyline(p, nextRing)
    const f = d - target
    if (Math.abs(f) < target * 0.05) break
    if (f > 0) hi = t; else lo = t
    t = (lo + hi) * 0.5
  }
  return Math.max(t, 0)
}

export function computeOvalChainScaffold({
  firstRing,
  nextRing,
  startCenter,
  ringPlaneNormal,
  stitchGauge,
  handedness = 'right',
  chainThreshold = 1.6, // 1.6 widths switches to 2-chain
}) {
  if (!Array.isArray(firstRing) || firstRing.length < 3) return null
  const n = new THREE.Vector3(
    Number(ringPlaneNormal?.x) || 0,
    Number(ringPlaneNormal?.y) || 1,
    Number(ringPlaneNormal?.z) || 0
  ).normalize()

  // Fit plane basis and measure ovality by extents
  const centroid = computeCentroid(firstRing)
  const { u, v } = buildPlaneBasis(n)
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
  for (const p of firstRing) {
    const pv = new THREE.Vector3(p[0], p[1], p[2]).sub(centroid)
    const du = pv.dot(u)
    const dv = pv.dot(v)
    if (du < minU) minU = du; if (du > maxU) maxU = du
    if (dv < minV) minV = dv; if (dv > maxV) maxV = dv
  }
  const extentU = Math.max(1e-6, maxU - minU)
  const extentV = Math.max(1e-6, maxV - minV)
  const majorIsU = extentU >= extentV
  const majorExtent = Math.max(extentU, extentV)
  const minorExtent = Math.min(extentU, extentV)
  const ovalRatio = majorExtent / Math.max(1e-6, minorExtent)

  const centerOnPlane = projectPointToPlane(new THREE.Vector3(startCenter.x, startCenter.y, startCenter.z), centroid, n)
  let majorDir = (majorIsU ? u : v).clone()

  // If we have a next ring, refine major direction using centroids difference projected onto plane
  if (Array.isArray(nextRing) && nextRing.length >= 3) {
    const c2 = computeCentroid(nextRing)
    majorDir = c2.clone().sub(centroid)
    majorDir.sub(n.clone().multiplyScalar(majorDir.dot(n)))
    if (majorDir.lengthSq() < 1e-10) majorDir.copy(majorIsU ? u : v)
    majorDir.normalize()
  }

  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  const t = Array.isArray(nextRing) && nextRing.length >= 3
    ? solveOffsetForTargetDistance(centerOnPlane, majorDir, nextRing, gaugeW)
    : gaugeW

  const endA = centerOnPlane.clone().add(majorDir.clone().multiplyScalar(t))
  const endB = centerOnPlane.clone().add(majorDir.clone().multiplyScalar(-t))
  const chainLen = endA.distanceTo(endB)
  const chainCountApprox = chainLen / gaugeW
  const chainCount = chainCountApprox >= chainThreshold ? 2 : 1

  // Build nodes at chain endpoints if count=2, else one node at center
  const nodes = []
  const tang = new THREE.Vector3().crossVectors(n, majorDir) // along minor direction
  if (chainCount === 2) {
    nodes.push({ id: 0, p: [endA.x, endA.y, endA.z], tangent: [tang.x, tang.y, tang.z], next: 1, prev: 1 })
    nodes.push({ id: 1, p: [endB.x, endB.y, endB.z], tangent: [tang.x, tang.y, tang.z], next: 0, prev: 0 })
  } else {
    nodes.push({ id: 0, p: [centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], tangent: [tang.x, tang.y, tang.z], next: 0, prev: 0 })
  }

  const scaffold = {
    segments: [
      [[centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], [endA.x, endA.y, endA.z]],
      [[centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], [endB.x, endB.y, endB.z]],
    ],
    meta: { center: [centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], normal: [n.x, n.y, n.z], majorDir: [majorDir.x, majorDir.y, majorDir.z], ovalRatio },
  }

  return {
    chain: { count: chainCount, approx: chainCountApprox },
    nodeRing0: { nodes, meta: { isChainStart: true, center: [centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], normal: [n.x, n.y, n.z] } },
    scaffold,
  }
}


