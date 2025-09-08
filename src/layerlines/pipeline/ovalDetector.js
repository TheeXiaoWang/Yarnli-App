import * as THREE from 'three'

function buildPlaneBasis(normal) {
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(u.dot(normal)) > 0.9) u.set(0, 1, 0)
  u.sub(normal.clone().multiplyScalar(u.dot(normal))).normalize()
  const v = new THREE.Vector3().crossVectors(normal, u)
  return { u, v }
}

function centroidOf(poly) {
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

function solveOffsetForTargetDistance(centerOnPlane, dir, nextRing, target) {
  let lo = 0
  let hi = Math.max(target * 4, 1e-3)
  for (let i = 0; i < 12; i++) {
    const p = centerOnPlane.clone().add(dir.clone().multiplyScalar(hi))
    const d = nearestDistancePointToPolyline(p, nextRing)
    if (d >= target * 0.95) break
    hi *= 1.8
  }
  for (let it = 0; it < 24; it++) {
    const mid = (lo + hi) / 2
    const p = centerOnPlane.clone().add(dir.clone().multiplyScalar(mid))
    const d = nearestDistancePointToPolyline(p, nextRing)
    if (Math.abs(d - target) < target * 0.05) return mid
    if (d > target) hi = mid; else lo = mid
  }
  return (lo + hi) / 2
}

function pickRingClosestToPoint(layers, point) {
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

function pickNextRingByDistance(layers, point, firstPoly) {
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
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].poly !== firstPoly) return entries[i]
  }
  return null
}

function normalFromPolyline(poly) {
  if (!Array.isArray(poly) || poly.length < 3) return new THREE.Vector3(0, 1, 0)
  const n = poly.length
  const p0 = new THREE.Vector3(...poly[0])
  const p1 = new THREE.Vector3(...poly[Math.floor(n / 3)])
  const p2 = new THREE.Vector3(...poly[Math.floor((2 * n) / 3)])
  const normal = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p2, p0))
  if (normal.lengthSq() < 1e-10) return new THREE.Vector3(0, 1, 0)
  return normal.normalize()
}

export function detectOvalStart({ layers, startCenter, ringPlaneNormal, stitchGauge, ovalThreshold = 1.3, chainThreshold = 1.6, poleAxis = null }) {
  const firstSel = pickRingClosestToPoint(layers, startCenter)
  if (!firstSel) return { isOval: false }
  const nextSel = pickNextRingByDistance(layers, startCenter, firstSel.poly)
  const firstRing = firstSel.poly
  const nextRing = nextSel?.poly

  const nInit = ringPlaneNormal && typeof ringPlaneNormal.x === 'number'
    ? new THREE.Vector3(ringPlaneNormal.x, ringPlaneNormal.y, ringPlaneNormal.z)
    : normalFromPolyline(firstRing)
  const n = nInit.normalize()
  const c1 = centroidOf(firstRing)
  const { u, v } = buildPlaneBasis(n)
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
  for (const p of firstRing) {
    const pv = new THREE.Vector3(p[0], p[1], p[2]).sub(c1)
    const du = pv.dot(u), dv = pv.dot(v)
    if (du < minU) minU = du; if (du > maxU) maxU = du
    if (dv < minV) minV = dv; if (dv > maxV) maxV = dv
  }
  const extentU = Math.max(1e-6, maxU - minU)
  const extentV = Math.max(1e-6, maxV - minV)
  const ratio = Math.max(extentU, extentV) / Math.min(extentU, extentV)
  try { console.log('[OvalDetect] ratio=', Number(ratio).toFixed(4), 'threshold=', ovalThreshold, 'hasNextRing=', !!nextRing) } catch(_) {}
  // Extremely sensitive by default: any deviation beyond ~0.1% triggers oval handling
  if (ratio <= ovalThreshold) return { isOval: false, ratio }

  // Major direction
  // Determine in-plane major axis via covariance of the first ring projected to (u,v)
  let Sxx = 0, Syy = 0, Sxy = 0
  for (const p of firstRing) {
    const pv = new THREE.Vector3(p[0], p[1], p[2]).sub(c1)
    const x = pv.dot(u)
    const y = pv.dot(v)
    Sxx += x * x
    Syy += y * y
    Sxy += x * y
  }
  const invN = 1 / Math.max(1, firstRing.length)
  Sxx *= invN; Syy *= invN; Sxy *= invN
  const angle = 0.5 * Math.atan2(2 * Sxy, Sxx - Syy)
  const vx = Math.cos(angle)
  const vy = Math.sin(angle)
  let majorDir = u.clone().multiplyScalar(vx).add(v.clone().multiplyScalar(vy))
  // Refine using next ring direction if available and not degenerate
  if (Array.isArray(nextRing) && nextRing.length >= 3) {
    const dCentroid = centroidOf(nextRing).sub(c1)
    dCentroid.sub(n.clone().multiplyScalar(dCentroid.dot(n)))
    if (dCentroid.lengthSq() > 1e-10 && dCentroid.dot(majorDir) < 0) {
      majorDir.multiplyScalar(-1) // align orientation
    }
  }
  if (majorDir.lengthSq() < 1e-10) majorDir.copy(u)
  majorDir.normalize()

  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  // Place start segment centered at the start pole and lying on the first-ring plane (accounts for rotation)
  const sc = new THREE.Vector3(startCenter.x, startCenter.y, startCenter.z)
  const dPlane = n.dot(sc.clone().sub(c1))
  const centerOnPlane = sc.clone().sub(n.clone().multiplyScalar(dPlane))
  // Length: solve radially; Direction: use local ring tangent near the pole for visual alignment
  let tSolve = gaugeW
  if (Array.isArray(nextRing) && nextRing.length >= 3) {
    try { tSolve = solveOffsetForTargetDistance(centerOnPlane, majorDir, nextRing, gaugeW) } catch(_) { tSolve = gaugeW }
  }
  const t = Math.max(gaugeW, tSolve)

  // Tangent orientation: prefer pole axis to lock to object rotation, else use local ring flow
  let tangentDir
  if (poleAxis && typeof poleAxis.x === 'number') {
    // Project poleAxis into ring plane and use it as local 'azimuth' direction, then tangent = n x azimuth
    const axisProj = new THREE.Vector3(poleAxis.x, poleAxis.y, poleAxis.z)
      .sub(n.clone().multiplyScalar(new THREE.Vector3(poleAxis.x, poleAxis.y, poleAxis.z).dot(n)))
    if (axisProj.lengthSq() > 1e-10) tangentDir = new THREE.Vector3().crossVectors(n, axisProj).normalize()
  }
  if (!tangentDir) {
    const radialDir = centerOnPlane.clone().sub(c1)
    radialDir.sub(n.clone().multiplyScalar(radialDir.dot(n)))
    tangentDir = new THREE.Vector3().crossVectors(n, radialDir).normalize()
  }
  if (!isFinite(tangentDir.x) || tangentDir.lengthSq() < 1e-10) {
    tangentDir = new THREE.Vector3().crossVectors(n, majorDir).normalize()
  }

  const endA = centerOnPlane.clone().add(tangentDir.clone().multiplyScalar(t))
  const endB = centerOnPlane.clone().add(tangentDir.clone().multiplyScalar(-t))
  try { console.log('[OvalDetect] centerOnPlane=', centerOnPlane.toArray(), 'tangentDir=', tangentDir.toArray(), 'halfLen=', t, 'usingPoleAxis=', !!poleAxis) } catch(_) {}
  const chainLen = endA.distanceTo(endB)
  const approx = chainLen / gaugeW
  const count = approx >= chainThreshold ? 2 : 1

  const chainPolyline = [ [endB.x, endB.y, endB.z], [centerOnPlane.x, centerOnPlane.y, centerOnPlane.z], [endA.x, endA.y, endA.z] ]
  const startSegment = chainPolyline

  return {
    isOval: true,
    ratio,
    chain: { count, approx, polyline: chainPolyline, majorDir: [majorDir.x, majorDir.y, majorDir.z] },
    startSegment,
    firstRing,
    nextRing,
    plane: { center: [c1.x, c1.y, c1.z], normal: [n.x, n.y, n.z] },
  }
}


