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
  endCenter,
  ringPlaneNormal,
  handedness = 'right',
  tightenFactor = 0.9,
  firstRing = null, // optional: polyline points [[x,y,z]...]
  debugLogs = true,
  nextRing = null, // optional: second ring to infer oval direction/chain
  overrideStitchCount = null, // if set, force S0 to this value
}) {
  const gaugeW = Math.max(1e-6, Number(stitchGauge?.width) || 0)
  const factor = 0.9

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
  const e = new THREE.Vector3(
    Number(endCenter?.x) || 0,
    Number(endCenter?.y) || 0,
    Number(endCenter?.z) || 0,
  )
  const surfaceCenter = new THREE.Vector3().addVectors(c, e).multiplyScalar(0.5)

  // Build orthonormal basis (u, v, n) on the plane
  let u = new THREE.Vector3(1, 0, 0)
  if (Math.abs(u.dot(n)) > 0.9) u.set(0, 1, 0)
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)

  let nodes = []
  let scaffoldSegments = null
  let metaCenter = [c.x, c.y, c.z]
  let metaNormal = [n.x, n.y, n.z]
  let metaRadius = 0
  let S0 = Math.max(3, Math.round(Number(mrCountResult?.magicRing?.stitchCount) || 0))

  // If a first layer ring polyline is provided, calculate optimal node count and positioning
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

    // Calculate the actual circumference of the first layer ring
    let ringCircumference = 0
    for (let i = 0; i < pts.length; i++) {
      const current = new THREE.Vector3(...pts[i])
      const next = new THREE.Vector3(...pts[(i + 1) % pts.length])
      ringCircumference += current.distanceTo(next)
    }

    // Calculate optimal node count based on tip-to-tip fitting unless overridden
    const effectiveNodeWidth = gaugeW * factor
    const computedS0 = Math.max(3, Math.round(ringCircumference / effectiveNodeWidth))
    S0 = Math.max(3, Math.round(overrideStitchCount ?? computedS0))

    // Debug logging
    if (debugLogs) {
      console.log('[MR-Nodes] Stitch count override logic:', {
        'overrideStitchCount (from settings)': overrideStitchCount,
        'computedS0 (from circumference)': computedS0,
        'S0 (final value)': S0,
        'ringCircumference': ringCircumference.toFixed(4),
        'effectiveNodeWidth': effectiveNodeWidth.toFixed(4),
      })
    }
    
    // Recalculate the actual radius from the ring points for accurate positioning
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

    // Node ordering by handedness: left = CCW (positive angles), right = CW (negative)
    const angleStep = (handedness === 'left' ? 1 : -1) * ((2 * Math.PI) / S0)

    scaffoldSegments = []
    nodes = []
    
    // Create nodes positioned on the first layer ring circle approximation
    for (let i = 0; i < S0; i++) {
      const a = i * angleStep
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      
      // Position node on the first layer ring
      const end = new THREE.Vector3().copy(cOnRing)
        .add(uRing.clone().multiplyScalar(rRing * ca))
        .add(vRing.clone().multiplyScalar(rRing * sa))

      // Create scaffold segment from start pole to this node
      scaffoldSegments.push([[c.x, c.y, c.z], [end.x, end.y, end.z]])

      // Calculate tangent vector (perpendicular to radial direction)
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

    if (debugLogs) {
      console.log('[MR-Nodes] First layer ring analysis:', {
        ringCircumference: ringCircumference.toFixed(4),
        effectiveNodeWidth: effectiveNodeWidth.toFixed(4),
        calculatedStitchCount: S0,
        originalStitchCount: mrCountResult?.magicRing?.stitchCount,
        ringRadius: rRing.toFixed(4),
        nodeSpacing: (ringCircumference / S0).toFixed(4)
      })
    }

  } else {
    // Fallback: nodes on MR plane and scaffold from center to nodes
    // Use the original stitch count calculation
    const circumference = S0 * gaugeW * factor
    const radiusDefault = circumference / (2 * Math.PI)
    
    // Node ordering by handedness: left = CCW (positive angles), right = CW (negative)
    const angleStep = (handedness === 'left' ? 1 : -1) * ((2 * Math.PI) / S0)

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
    metaRadius = radiusDefault
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
        surfaceCenter: [surfaceCenter.x, surfaceCenter.y, surfaceCenter.z],
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

