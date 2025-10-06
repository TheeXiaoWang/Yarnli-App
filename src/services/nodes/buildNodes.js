import * as THREE from 'three'
import { buildNodeQuaternion } from '../nodeOrientation/buildNodeQuaternion'
import { STITCH_TYPES } from '../../constants/stitchTypes'

// Deprecated: resetTiltTrend() was removed as tilt trend tracking is no longer needed
// The corrected sphere-based formula provides consistent tilt values without state tracking
export function resetTiltTrend() {
  // No-op: kept for backward compatibility
}

export const buildNodes = (evenPts, ringCenter, sphereCenter, up, rNext, overrideRollAngle = null, hemisphereSign = null, stitchType = 'sc', layerMeta = null) => {
  const ringCenterV = new THREE.Vector3(ringCenter[0], ringCenter[1], ringCenter[2])
  const sphereCenterV = new THREE.Vector3(sphereCenter[0], sphereCenter[1], sphereCenter[2])
  const upV = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()

  // Tilt calculation is now handled in buildScaffoldStep using computeTiltFromRadiusDeltas()
  // The rollAngle is passed via overrideRollAngle parameter
  const baseRoll = overrideRollAngle != null ? overrideRollAngle : 0

  // Placeholder values for backward compatibility (no longer used)
  const latitude = 0
  const yNorm = 0

  // Use the roll angle directly for full 180° rotation range
  const signedRoll = baseRoll

  const nEven = Math.max(1, evenPts.length)

  // LAYER-LEVEL TANGENT CONSISTENCY CHECK
  // Ensure the first node's tangent direction is consistent across all layers
  // This prevents asymmetric orientation between start and end poles
  if (nEven >= 2) {
    // Get first node's tangent direction
    const firstEntry = evenPts[0]
    const secondEntry = evenPts[1]
    const p0 = firstEntry.p || firstEntry
    const p1 = secondEntry.p || secondEntry

    // Calculate first node's tangent
    const firstTangent = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize()

    // Calculate first node's normal
    const pn0 = new THREE.Vector3(p0[0], p0[1], p0[2])
    const nrm0 = pn0.clone().sub(sphereCenterV).normalize()

    // Project tangent to surface plane
    const tProjected = firstTangent.clone().sub(nrm0.clone().multiplyScalar(firstTangent.dot(nrm0))).normalize()

    // Fixed reference direction (perpendicular to sphere axis)
    const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()

    // Project reference onto surface plane
    const refProjected = referenceDir.clone().sub(nrm0.clone().multiplyScalar(referenceDir.dot(nrm0)))

    // Check if we need to reverse node ordering for this layer
    let shouldReverse = false
    if (refProjected.lengthSq() > 1e-6) {
      refProjected.normalize()
      // If tangent points opposite to reference, we should reverse the node order
      if (tProjected.dot(refProjected) < 0) {
        shouldReverse = true
      }
    }

    // Reverse node order if needed to ensure consistent tangent direction
    if (shouldReverse) {
      evenPts.reverse()
    }
  }

  // Get stitch type properties
  const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
  
  // Ensure stitchProfile exists
  if (!stitchProfile) {
    console.error('Invalid stitch type in buildNodes:', stitchType, 'Available types:', Object.keys(STITCH_TYPES))
    return evenPts.map((e, i) => ({
      id: (i + 1) % evenPts.length,
      p: e.p || e,
      theta: 0,
      quaternion: [0, 0, 0, 1],
      stitchType: 'sc',
      stitchProfile: STITCH_TYPES.sc,
    }))
  }
  
  // Enable debug logging for first layer
  if (typeof window !== 'undefined' && !window.__DEBUG_NODE_ORIENTATION) {
    window.__DEBUG_NODE_ORIENTATION = true
    window.__DEBUG_NODE_ORIENTATION_INDEX = 0
  }

  const nodes = evenPts.map((e, i) => {
    const prevEntry = evenPts[(i - 1 + nEven) % nEven]
    const nextEntry = evenPts[(i + 1) % nEven]
    const prev = prevEntry.p || prevEntry
    const next = nextEntry.p || nextEntry
    const p = e.p || e
    // FIX: Use sphereCenterV for surface normal calculation, not ringCenterV
    // This ensures nodes orient perpendicular to the object's surface
    const q = buildNodeQuaternion(p, prev, next, sphereCenterV, upV, signedRoll, latitude, yNorm)

    const node = {
      id: (i + 1) % nEven,
      p,
      theta: signedRoll,
      quaternion: [q.x, q.y, q.z, q.w],
      stitchType: stitchType,
      stitchProfile: stitchProfile,
    }

    // DEBUG: Log first 3 nodes
    if (i < 3 && typeof window !== 'undefined' && window.__DEBUG_NODE_ORIENTATION) {
      console.log(`[buildNodes] Node ${i} created:`, {
        id: node.id,
        position: node.p,
        quaternion: node.quaternion,
        stitchType: node.stitchType,
      })
    }

    return node
  })

  // DEBUG: Summary log
  if (typeof window !== 'undefined' && window.__DEBUG_NODE_ORIENTATION) {
    console.log(`[buildNodes] Created ${nodes.length} nodes with quaternions`)
    window.__DEBUG_NODE_ORIENTATION = false // Reset for next layer
  }

  // COMPREHENSIVE DEBUG: Track quaternions for first and last layers
  if (typeof window !== 'undefined') {
    // Initialize layer counter if not exists
    if (window.__LAYER_COUNTER === undefined) {
      window.__LAYER_COUNTER = 0
      window.__TOTAL_LAYERS = 0
    }

    const currentLayerIndex = window.__LAYER_COUNTER
    window.__LAYER_COUNTER++

    // Log first layer (index 0)
    if (currentLayerIndex === 0 && nodes.length > 0) {
      const firstNode = nodes[0]
      console.log('[buildNodes] FIRST LAYER - Node 0 quaternion:', {
        layerIndex: currentLayerIndex,
        y: ringCenter[1],
        position: firstNode.p,
        quaternion: firstNode.quaternion,
        theta: firstNode.theta,
        thetaDeg: THREE.MathUtils.radToDeg(firstNode.theta),
      })
    }

    // Store layer info for last layer detection
    window.__LAST_LAYER_INFO = {
      layerIndex: currentLayerIndex,
      y: ringCenter[1],
      nodes: nodes,
    }
  }

  return nodes
}


