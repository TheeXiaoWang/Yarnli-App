import * as THREE from 'three'
import { vec } from '../utils'
import { buildFacingFrame, pickStableAnchor } from './stableAnchors'
import { nearestPointOnPolyline } from './anchors'

export function buildStackAnchors(arr, poles, axis, opts = {}) {
  const anchors = []
  if (!arr || arr.length === 0 || !poles || poles.length < 2) return { startPole: null, endPole: null, anchors }
  const pA = vec(poles[0])
  const pB = vec(poles[1])
  // Use the first presentable ring for frame construction; if first is loose, it still works
  const firstLayer = arr[0]
  const frameA = buildFacingFrame(axis, firstLayer, pA)
  const frameB = buildFacingFrame(axis, firstLayer, pB)
  const firstA = pickStableAnchor(arr[0], frameA, null, { maxDrift: Infinity })
  const firstB = pickStableAnchor(arr[0], frameB, null, { maxDrift: Infinity })
  const dA = firstA ? firstA.distanceTo(pA) : Infinity
  const dB = firstB ? firstB.distanceTo(pB) : Infinity
  const startPole = (dA <= dB) ? pA : pB
  const endPole = startPole.equals(pA) ? pB : pA
  const frame = buildFacingFrame(axis, arr[0], startPole)
  let prev = null
  for (let i = 0; i < arr.length; i++) {
    let a = (i === 0 && opts.seedFirstAnchor) ? opts.seedFirstAnchor : pickStableAnchor(arr[i], frame, prev, { maxDrift: opts.maxDrift ?? Infinity })
    if (!a && prev) a = nearestPointOnPolyline(arr[i], prev)
    if (!a) {
      // final fallback: midpoint of polyline
      const poly = arr[i]?.polylines?.[0]
      if (poly && poly.length) {
        const m = poly[Math.floor(poly.length / 2)]
        a = new THREE.Vector3(m[0], m[1], m[2])
      }
    }
    anchors.push(a || null)
    prev = a || prev
  }
  return { startPole, endPole, anchors }
}


