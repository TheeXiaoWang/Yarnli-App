import * as THREE from 'three'
import { getFirstLayerRing } from '../../../utils/layers/layerUtils'

/**
 * Decide stitch count S0 and an anchor plane for the first layer.
 *
 * Inputs:
 * - layers: layerline output (read-only)
 * - firstRing: optional polyline to use directly (otherwise picked from layers)
 * - startCenter: THREE.Vector3 start pole
 * - endCenter: THREE.Vector3 end pole (for axis)
 * - ringPlaneNormal: preferred MR normal
 * - stitchGauge: { width:number, height?:number }
 * - tightenFactor: spacing multiplier along the ring (width)
 *
 * Outputs:
 * - { S0, anchor: { center:[x,y,z], normal:[x,y,z], radius:number, key:number }, ring: number[][]|null }
 */
export function firstLayerPlanner({ layers, firstRing = null, startCenter, endCenter, ringPlaneNormal, stitchGauge, tightenFactor = 1.0 }) {
  const c = startCenter instanceof THREE.Vector3
    ? startCenter.clone()
    : new THREE.Vector3(Number(startCenter?.x)||0, Number(startCenter?.y)||0, Number(startCenter?.z)||0)
  const e = endCenter instanceof THREE.Vector3
    ? endCenter.clone()
    : new THREE.Vector3(Number(endCenter?.x)||0, Number(endCenter?.y)||0, Number(endCenter?.z)||0)
  const axisDir = new THREE.Vector3().subVectors(e, c)
  if (axisDir.lengthSq() < 1e-12) axisDir.set(0, 1, 0)
  axisDir.normalize()

  const nPref = ringPlaneNormal instanceof THREE.Vector3
    ? ringPlaneNormal.clone()
    : new THREE.Vector3(Number(ringPlaneNormal?.x)||0, Number(ringPlaneNormal?.y)||1, Number(ringPlaneNormal?.z)||0)
  if (nPref.lengthSq() < 1e-12) nPref.set(0,1,0)
  nPref.normalize()

  // Pick ring
  const ring = Array.isArray(firstRing) && firstRing.length >= 3
    ? firstRing
    : getFirstLayerRing(layers, c)

  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  const factor = Math.max(0.1, Math.min(2.0, Number(tightenFactor) || 0.8))

  if (!ring || ring.length < 3) {
    // Fallback: no ring available; return neutral plan using MR plane
    const circumference = 2 * Math.PI * (gaugeW * factor)
    const S0 = Math.max(3, Math.round(circumference / (gaugeW * factor)))
    const key = axisDir.dot(new THREE.Vector3().subVectors(c, c))
    return {
      S0,
      anchor: { center: [c.x, c.y, c.z], normal: [nPref.x, nPref.y, nPref.z], radius: (gaugeW * factor) / (2*Math.PI), key },
      ring: null,
    }
  }

  // Compute centroid and robust normal from ring
  const pts = ring
  const centroid = pts.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).multiplyScalar(1 / pts.length)
  const p0 = new THREE.Vector3(...pts[0])
  const p1 = new THREE.Vector3(...pts[Math.floor(pts.length / 3)])
  const p2 = new THREE.Vector3(...pts[Math.floor((2 * pts.length) / 3)])
  let nRing = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p2, p0))
  if (nRing.lengthSq() < 1e-12) nRing = new THREE.Vector3(0, 1, 0)
  nRing.normalize()
  if (nRing.dot(nPref) < 0) nRing.multiplyScalar(-1)

  // Project start center onto ring plane to anchor center
  const dist = nRing.dot(new THREE.Vector3().subVectors(c, centroid))
  const cOnRing = new THREE.Vector3().copy(c).sub(nRing.clone().multiplyScalar(dist))

  // Circumference of ring polyline
  let ringCirc = 0
  for (let i = 0; i < pts.length; i++) {
    const a = new THREE.Vector3(...pts[i])
    const b = new THREE.Vector3(...pts[(i + 1) % pts.length])
    ringCirc += a.distanceTo(b)
  }

  // Decide S0 from circumference and effective node width
  const effectiveNodeWidth = gaugeW * factor
  const S0 = Math.max(3, Math.round(ringCirc / effectiveNodeWidth))

  // Average radius relative to centroid (good enough for near-circular rings)
  let rRing = 0
  for (const p of pts) rRing += new THREE.Vector3(p[0], p[1], p[2]).distanceTo(centroid)
  rRing /= pts.length

  const key = axisDir.dot(new THREE.Vector3().copy(cOnRing).sub(c))

  return {
    S0,
    anchor: { center: [cOnRing.x, cOnRing.y, cOnRing.z], normal: [nRing.x, nRing.y, nRing.z], radius: rRing, key },
    ring,
  }
}


