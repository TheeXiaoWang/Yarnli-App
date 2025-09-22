import * as THREE from 'three'

export function computeGridPointsBetween(
  nodes,
  density = 2,
  center = [0, 0, 0],
  eyeRadius = 0.12,
  axisDir = [0, 1, 0],
  normalOffset = 0                  // Surface-normal offset to position between layers
) {
  if (!Array.isArray(nodes) || nodes.length < 2) return []
  const pts = []
  const N = nodes.length

  const C = new THREE.Vector3(center[0], center[1], center[2])
  const A = new THREE.Vector3(...axisDir).normalize()
  const offset = Math.max(0.01, eyeRadius * 0.15)

  for (let i = 0; i < N; i++) {
    const na = nodes[i], nb = nodes[(i + 1) % N]
    const a = na?.p || na, b = nb?.p || nb
    if (!a || !b) continue

    const av = new THREE.Vector3(a[0], a[1], a[2])
    const bv = new THREE.Vector3(b[0], b[1], b[2])

    for (let k = 1; k <= density; k++) {
      const tLerp = k / (density + 1)

      // position & outward normal
      const p = av.clone().lerp(bv, tLerp)
      const n = p.clone().sub(C).normalize()
      const pos = p.clone().add(n.clone().multiplyScalar(offset))

      // ring tangent t = A × n  (robust fallback near poles)
      let t = new THREE.Vector3().crossVectors(A, n)
      if (t.lengthSq() < 1e-8) {
        // fallback: project world X onto plane ⟂ n
        const ref = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
        t = ref.clone().sub(n.clone().multiplyScalar(ref.dot(n)))
      }
      t.normalize()

      // polar angle vs vertical axis
      const c = Math.max(-1, Math.min(1, A.dot(n)))   // clamp
      const phi = Math.acos(c)                         // 0 top, π/2 equator, π bottom

      // dome direction D = A*cosφ + t*sinφ
      const D = A.clone().multiplyScalar(Math.cos(phi))
        .add(t.clone().multiplyScalar(Math.sin(phi)))
        .normalize()

      // build orthonormal basis: local +Y=D, +Z=t, +X=Y×Z
      let X = new THREE.Vector3().crossVectors(D, t)
      if (X.lengthSq() < 1e-8) {
        // extremely rare: fix with an alternate tangent
        const ref = Math.abs(D.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
        const t2 = ref.clone().sub(D.clone().multiplyScalar(ref.dot(D))).normalize()
        X = new THREE.Vector3().crossVectors(D, t2)
      }
      X.normalize()
      const Z = new THREE.Vector3().crossVectors(X, D).normalize()

      const m = new THREE.Matrix4().makeBasis(X, D, Z)
      const q = new THREE.Quaternion().setFromRotationMatrix(m)

      // Apply offset along the surface normal to position grid points between layers
      // This works better for curved surfaces where layers aren't just vertically spaced
      const normalVec = new THREE.Vector3(n.x, n.y, n.z)
      const offsetPosition = new THREE.Vector3(pos.x, pos.y, pos.z)
        .add(normalVec.multiplyScalar(normalOffset))
      
      pts.push({
        position: [offsetPosition.x, offsetPosition.y, offsetPosition.z],
        normal: [n.x, n.y, n.z],
        ringTangent: [t.x, t.y, t.z],
        quaternion: [q.x, q.y, q.z, q.w],
        segmentIndex: i,
        t: tLerp
      })
    }
  }

  return pts
}
