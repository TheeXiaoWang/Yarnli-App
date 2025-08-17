import * as THREE from 'three'

/**
 * Place S0 ordered nodes on the Magic Ring plane.
 * - Computes a circular ring radius so arc spacing ≈ stitchGauge.width * tightenFactor
 * - Generates an ordered, closed loop with next/prev links
 * - Positions lie on a single plane defined by center+normal
 * - No rendering, no snapping to layer lines
 *
 * @param {Object} params
 * @param {{ magicRing: { stitchCount: number, plane?: { center?: number[], normal?: number[] } } }} params.mrCountResult
 * @param {{ width: number }} params.stitchGauge
 * @param {THREE.Vector3} [params.startCenter] - Preferred explicit center
 * @param {THREE.Vector3} [params.ringPlaneNormal] - Preferred explicit normal
 * @param {'right'|'left'} [params.handedness='right']
 * @param {number} [params.tightenFactor=0.8]
 * @returns {{ nodeRing0: { nodes: Array<{ id:number, p:number[], tangent:number[], next:number, prev:number }>, meta: { isMagicRing: true, stitchCount:number, radius:number, center:number[], normal:number[], handedness:'right'|'left', tightenFactor:number }}}}
 */
export function computeMagicRingNodes({
  mrCountResult,
  stitchGauge,
  startCenter,
  ringPlaneNormal,
  handedness = 'right',
  tightenFactor = 0.8,
  firstRing = null, // optional: polyline points [[x,y,z]...]
  debugLogs = true,
  nextRing = null, // optional: second ring to infer oval direction/chain
}) {
  const S0 = Math.max(3, Math.round(Number(mrCountResult?.magicRing?.stitchCount) || 0))
  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  const factor = Math.max(0.1, Math.min(2.0, Number(tightenFactor) || 0.8))

  // Plane definition: prefer explicit center/normal; else fall back to MR-Count plane if provided
  const n = new THREE.Vector3(
    Number(ringPlaneNormal?.x ?? mrCountResult?.magicRing?.plane?.normal?.[0]) || 0,
    Number(ringPlaneNormal?.y ?? mrCountResult?.magicRing?.plane?.normal?.[1]) || 1,
    Number(ringPlaneNormal?.z ?? mrCountResult?.magicRing?.plane?.normal?.[2]) || 0,
  )
  if (n.lengthSq() < 1e-12) n.set(0, 1, 0)
  n.normalize()

  const c = new THREE.Vector3(
    Number(startCenter?.x ?? mrCountResult?.magicRing?.plane?.center?.[0]) || 0,
    Number(startCenter?.y ?? mrCountResult?.magicRing?.plane?.center?.[1]) || 0,
    Number(startCenter?.z ?? mrCountResult?.magicRing?.plane?.center?.[2]) || 0,
  )

  // Compute radius from desired arc spacing per stitch (MR-plane default)
  const circumference = S0 * gaugeW * factor
  const radiusDefault = circumference / (2 * Math.PI)

  // Build orthonormal basis (u, v, n) on the plane
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(u.dot(n)) > 0.9) u.set(0, 1, 0)
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)

  // Node ordering by handedness: left = CCW (positive angles), right = CW (negative)
  const angleStep = (handedness === 'left' ? 1 : -1) * ((2 * Math.PI) / S0)

  let nodes = []
  let scaffoldSegments = null
  let metaCenter = [c.x, c.y, c.z]
  let metaNormal = [n.x, n.y, n.z]
  let metaRadius = radiusDefault

  // If a first layer ring polyline is provided, align nodes and scaffold to that ring plane
  if (Array.isArray(firstRing) && firstRing.length >= 3) {
    // Fit plane from ring points (centroid + robust normal)
    const pts = firstRing
    const centroid = pts.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).multiplyScalar(1 / pts.length)
    // Pick widely spaced indices for stability
    const p0 = new THREE.Vector3(...pts[0])
    const p1 = new THREE.Vector3(...pts[Math.floor(pts.length / 3)])
    const p2 = new THREE.Vector3(...pts[Math.floor((2 * pts.length) / 3)])
    let nRing = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p2, p0))
    if (nRing.lengthSq() < 1e-12) nRing = new THREE.Vector3(0, 1, 0)
    nRing.normalize()
    // Keep orientation consistent with provided normal
    if (nRing.dot(n) < 0) nRing.multiplyScalar(-1)

    // Project start center onto ring plane to serve as ring-plane center reference
    const dist = nRing.dot(new THREE.Vector3().subVectors(c, centroid))
    const cOnRing = new THREE.Vector3().copy(c).sub(nRing.clone().multiplyScalar(dist))

    // Ring radius from centroid
    let rRing = 0
    for (const p of pts) rRing += new THREE.Vector3(p[0], p[1], p[2]).distanceTo(centroid)
    rRing /= pts.length

    // Build ring-plane basis aligned with MR u as much as possible
    let uRing = u.clone().sub(nRing.clone().multiplyScalar(u.dot(nRing))).normalize()
    if (uRing.lengthSq() < 1e-8) {
      uRing = new THREE.Vector3(1, 0, 0)
      if (Math.abs(uRing.dot(nRing)) > 0.9) uRing.set(0, 1, 0)
      uRing.sub(nRing.clone().multiplyScalar(uRing.dot(nRing))).normalize()
    }
    const vRing = new THREE.Vector3().crossVectors(nRing, uRing)

    scaffoldSegments = []
    nodes = []
    for (let i = 0; i < S0; i++) {
      const a = i * angleStep
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const end = new THREE.Vector3().copy(cOnRing)
        .add(uRing.clone().multiplyScalar(rRing * ca))
        .add(vRing.clone().multiplyScalar(rRing * sa))

      scaffoldSegments.push([[c.x, c.y, c.z], [end.x, end.y, end.z]])

      const tangent = new THREE.Vector3().copy(uRing).multiplyScalar(-sa).add(vRing.clone().multiplyScalar(ca)).normalize()
      if (handedness !== 'left') tangent.multiplyScalar(-1)

      nodes.push({
        id: i,
        p: [end.x, end.y, end.z],
        tangent: [tangent.x, tangent.y, tangent.z],
        next: (i + 1) % S0,
        prev: (i - 1 + S0) % S0,
      })
    }

    metaCenter = [cOnRing.x, cOnRing.y, cOnRing.z]
    metaNormal = [nRing.x, nRing.y, nRing.z]
    metaRadius = rRing

    // Optional: if the ring is notably elliptical, create an initial "chain" segment across the long axis
    // to emulate crochet oval start. Use nextRing to detect axis direction
    if (Array.isArray(nextRing) && nextRing.length >= 3) {
      // Determine principal directions by comparing centroids of consecutive rings
      const centroid = pts.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).multiplyScalar(1 / pts.length)
      const centroid2 = nextRing.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).multiplyScalar(1 / nextRing.length)
      let majorDir = new THREE.Vector3().subVectors(centroid2, centroid)
      // Project onto ring plane
      majorDir.sub(nRing.clone().multiplyScalar(majorDir.dot(nRing)))
      if (majorDir.lengthSq() < 1e-10) majorDir = uRing.clone() // fallback
      majorDir.normalize()
      const minorDir = new THREE.Vector3().crossVectors(nRing, majorDir)

      // Chain length: ensure each end is one stitch gauge away from next ring (approx)
      const chainHalfLen = Math.max(gaugeW * 0.5, gaugeW)
      const endA = new THREE.Vector3().copy(cOnRing).add(majorDir.clone().multiplyScalar(chainHalfLen))
      const endB = new THREE.Vector3().copy(cOnRing).add(majorDir.clone().multiplyScalar(-chainHalfLen))
      scaffoldSegments.unshift([[c.x, c.y, c.z], [endA.x, endA.y, endA.z]])
      scaffoldSegments.unshift([[c.x, c.y, c.z], [endB.x, endB.y, endB.z]])
      // Optional: move two nodes to chain ends to represent initial chain
      if (nodes.length >= 2) {
        nodes[0].p = [endA.x, endA.y, endA.z]
        nodes[1].p = [endB.x, endB.y, endB.z]
      }
    }
  } else {
    // Fallback: nodes on MR plane and scaffold from center to nodes
    nodes = []
    for (let i = 0; i < S0; i++) {
      const a = i * angleStep
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const pos = new THREE.Vector3().copy(c).add(u.clone().multiplyScalar(radiusDefault * ca)).add(v.clone().multiplyScalar(radiusDefault * sa))
      const tangent = new THREE.Vector3().copy(u).multiplyScalar(-sa).add(v.clone().multiplyScalar(ca)).normalize()
      if (handedness !== 'left') tangent.multiplyScalar(-1)
      nodes.push({ id: i, p: [pos.x, pos.y, pos.z], tangent: [tangent.x, tangent.y, tangent.z], next: (i + 1) % S0, prev: (i - 1 + S0) % S0 })
    }
    scaffoldSegments = nodes.map((node) => ([[c.x, c.y, c.z], node.p]))
  }

  return {
    nodeRing0: {
      nodes,
      meta: {
        isMagicRing: true,
        stitchCount: S0,
        radius: metaRadius,
        center: metaCenter,
        normal: metaNormal,
        handedness: handedness === 'left' ? 'left' : 'right',
        tightenFactor: factor,
      },
    },
    scaffold: {
      segments: scaffoldSegments,
      meta: {
        center: [c.x, c.y, c.z],
        normal: [n.x, n.y, n.z],
      }
    }
  }
}


