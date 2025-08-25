import * as THREE from 'three'

/**
 * Evenly distribute next-layer nodes around the ring.
 * Inputs:
 * - yNext, rNext, nextCount, center, up, handedness
 * Output: { nodes:[{p:[x,y,z], theta:number}], center:[x,y,z] }
 */
export function distributeNextNodes({ yNext, rNext, nextCount, center = [0, yNext, 0], up = [0,1,0], handedness = 'right' }) {
  const C = new THREE.Vector3(...center)
  const n = new THREE.Vector3(...up).normalize()
  let u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  const count = Math.max(1, Math.round(nextCount))
  const step = (handedness === 'left' ? 1 : -1) * ((2 * Math.PI) / count)
  const nodes = []
  for (let i = 0; i < count; i++) {
    const t = i * step
    const ca = Math.cos(t), sa = Math.sin(t)
    const P = C.clone().add(u.clone().multiplyScalar(rNext * ca)).add(v.clone().multiplyScalar(rNext * sa))
    nodes.push({ p: [P.x, P.y, P.z], theta: t })
  }
  return { nodes, center: [C.x, C.y, C.z] }
}


