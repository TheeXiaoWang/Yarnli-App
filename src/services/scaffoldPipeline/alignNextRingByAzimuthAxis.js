// Axis-aware next-ring alignment (keeps parent order intact).
// Sorts & rotates ONLY the next ring by azimuth around an arbitrary `up` axis.

import * as THREE from 'three'

function makeBasis(center, up) {
  const C = new THREE.Vector3(center[0], center[1], center[2])
  const n = new THREE.Vector3(up[0], up[1], up[2]).normalize()
  const seed = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const u = seed.clone().sub(n.clone().multiplyScalar(seed.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  return { C, u, v }
}

function azimuth(p, basis, handedness) {
  const { C, u, v } = basis
  const P = new THREE.Vector3(p[0], p[1], p[2])
  const d = P.clone().sub(C)
  const x = d.dot(u)
  const y = d.dot(v) * (handedness === 'left' ? -1 : 1)
  return Math.atan2(y, x) // [-π, π]
}

/**
 * Aligns the NEXT ring by azimuth around `up`, rotating it so its index 0
 * is closest in angle to parent[0]. Parent order is never changed.
 *
 * @param {number[][]} currentPts - array of [x,y,z] for current ring (parents)
 * @param {number[][]} nextPts - array of [x,y,z] for next ring (children)
 * @param {number[]} center - [x,y,z] axis origin for the ring plane
 * @param {number[]} up - [x,y,z] axis direction (any axis)
 * @param {'right'|'left'} handedness - azimuth direction (default 'right')
 * @returns {number[][]} rotated nextPts
 */
export function alignNextRingByAzimuthAxis(currentPts, nextPts, center, up, handedness = 'right') {
  if (!currentPts?.length || !nextPts?.length) return nextPts || []
  const basis = makeBasis(center, up)

  // sort next by azimuth
  const sorted = nextPts.map(p => ({ p, th: azimuth(p, basis, handedness) }))
                        .sort((a, b) => a.th - b.th)
  const angles = sorted.map(e => e.th)
  const target = azimuth(currentPts[0], basis, handedness)

  // pick rotation start closest to parent[0]
  let start = 0, best = Infinity
  for (let i = 0; i < angles.length; i++) {
    let d = Math.abs(target - angles[i]); d = Math.min(d, 2 * Math.PI - d)
    if (d < best) { best = d; start = i }
  }

  // rotate without changing relative order
  const n = sorted.length
  const out = new Array(n)
  for (let i = 0; i < n; i++) out[i] = sorted[(start + i) % n].p
  return out
}

export default alignNextRingByAzimuthAxis
