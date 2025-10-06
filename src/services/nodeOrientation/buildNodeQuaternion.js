import * as THREE from 'three'
import { MODEL_TO_CANON_Q } from '../../constants/orientation'

export function buildNodeQuaternion(p, prev, next, centerV, up, tiltRad, latitude = null, yNorm = null) {
  // Tangent (tip-to-tip direction around the ring)
  const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()

  // Outward normal (from sphere center to node position)
  const pn = new THREE.Vector3(p[0], p[1], p[2])
  const nrm = pn.clone().sub(centerV).normalize()

  // Sphere axis (up direction)
  const upV = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()

  // Ensure tangent is perpendicular to the normal (project out any radial component)
  // This prevents tangent from pointing inward/outward at the poles
  const tProjected = t.clone().sub(nrm.clone().multiplyScalar(t.dot(nrm))).normalize()

  // Basis: X = tangent, Y = binormal, Z = normal
  const X = tProjected.clone()
  const Z = nrm.clone()
  let Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  Z.copy(new THREE.Vector3().crossVectors(X, Y)).normalize()

  const basis = new THREE.Matrix4().makeBasis(X, Y, Z)
  const qBase = new THREE.Quaternion().setFromRotationMatrix(basis)

  // Canonical correction first
  qBase.multiply(MODEL_TO_CANON_Q)

  // Roll around the node's LOCAL X axis (tangent direction)
  // Use post-multiplication to apply rotation in local space
  const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
  const qFinal = qBase.clone().multiply(qRoll)

  // DEBUG: Log orientation data for first and last few nodes
  if (typeof window !== 'undefined' && window.__DEBUG_NODE_ORIENTATION) {
    const nodeIndex = window.__DEBUG_NODE_ORIENTATION_INDEX || 0
    const isFirstLayer = window.__DEBUG_NODE_ORIENTATION_FIRST_LAYER || false
    const isLastLayer = window.__DEBUG_NODE_ORIENTATION_LAST_LAYER || false

    if ((isFirstLayer && nodeIndex < 3) || (isLastLayer && nodeIndex < 3)) {
      const layerLabel = isFirstLayer ? 'FIRST' : isLastLayer ? 'LAST' : 'MIDDLE'
      console.log(`[buildNodeQuaternion] ${layerLabel} Layer Node ${nodeIndex}:`, {
        position: p,
        prev,
        next,
        center: [centerV.x, centerV.y, centerV.z],
        tangent: [t.x, t.y, t.z],
        normal: [nrm.x, nrm.y, nrm.z],
        tiltRad,
        tiltDeg: THREE.MathUtils.radToDeg(tiltRad),
        quaternion: [qFinal.x, qFinal.y, qFinal.z, qFinal.w],
        // Basis vectors for debugging
        basisX: [X.x, X.y, X.z],
        basisY: [Y.x, Y.y, Y.z],
        basisZ: [Z.x, Z.y, Z.z],
      })
      window.__DEBUG_NODE_ORIENTATION_INDEX = nodeIndex + 1
    }
  }

  // COMPREHENSIVE DEBUG: Track tangent consistency for first and last layers
  if (typeof window !== 'undefined' && typeof window.__LAYER_COUNTER === 'number') {
    const currentLayerIndex = window.__LAYER_COUNTER - 1 // Already incremented in buildNodes

    // Log first layer node 0
    if (currentLayerIndex === 0 && !window.__FIRST_LAYER_TANGENT_LOGGED) {
      window.__FIRST_LAYER_TANGENT_LOGGED = true

      // Calculate angle of tangent in XZ plane (azimuthal angle)
      const tangentAngleXZ = Math.atan2(X.z, X.x) * 180 / Math.PI

      // Recalculate reference direction for logging
      const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()
      const refProjected = referenceDir.clone().sub(nrm.clone().multiplyScalar(referenceDir.dot(nrm)))
      const usingReference = refProjected.lengthSq() > 1e-6

      console.log('[buildNodeQuaternion] FIRST LAYER - Tangent consistency check:', {
        layerIndex: currentLayerIndex,
        position: p,
        prev,
        next,
        upVector: [upV.x, upV.y, upV.z],
        rawTangent: [t.x, t.y, t.z],
        projectedTangent: [tProjected.x, tProjected.y, tProjected.z],
        referenceDir: usingReference ? [refProjected.x, refProjected.y, refProjected.z] : 'using azimuthal (near pole)',
        tangentDotReference: usingReference ? tProjected.dot(refProjected.clone().normalize()) : 'N/A',
        wasFlipped: usingReference ? tProjected.dot(refProjected.clone().normalize()) < 0 : 'N/A',
        finalTangent: [X.x, X.y, X.z],
        normal: [Z.x, Z.y, Z.z],
        tangentAngleXZ: tangentAngleXZ.toFixed(2) + '°',
        tiltRad,
        tiltDeg: THREE.MathUtils.radToDeg(tiltRad),
      })
    }

    // Store last layer info for logging after all layers processed
    const tangentAngleXZ = Math.atan2(X.z, X.x) * 180 / Math.PI

    // Recalculate reference direction for logging
    const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()
    const refProjected = referenceDir.clone().sub(nrm.clone().multiplyScalar(referenceDir.dot(nrm)))
    const usingReference = refProjected.lengthSq() > 1e-6

    window.__LAST_LAYER_TANGENT_INFO = {
      layerIndex: currentLayerIndex,
      position: p,
      prev,
      next,
      upVector: [upV.x, upV.y, upV.z],
      rawTangent: [t.x, t.y, t.z],
      projectedTangent: [tProjected.x, tProjected.y, tProjected.z],
      referenceDir: usingReference ? [refProjected.x, refProjected.y, refProjected.z] : 'using azimuthal (near pole)',
      tangentDotReference: usingReference ? tProjected.dot(refProjected.clone().normalize()) : 'N/A',
      wasFlipped: usingReference ? tProjected.dot(refProjected.clone().normalize()) < 0 : 'N/A',
      finalTangent: [X.x, X.y, X.z],
      normal: [Z.x, Z.y, Z.z],
      tangentAngleXZ: tangentAngleXZ.toFixed(2) + '°',
      tiltRad,
      tiltDeg: THREE.MathUtils.radToDeg(tiltRad),
    }
  }

  return qFinal
}


