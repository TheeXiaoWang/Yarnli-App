// src/services/sphereTiltPipeline/tiltLogger.js

/**
 * Log comprehensive tilt data for all layers.
 * 
 * This function outputs a console table showing tilt progression across all layers,
 * along with symmetry analysis and key observations.
 * 
 * @param {Array} tiltDataByLayer - Array of tilt data objects for each layer
 */
export function logTiltData(tiltDataByLayer) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) {
    return // Only log in development mode
  }

  if (!Array.isArray(tiltDataByLayer) || tiltDataByLayer.length === 0) {
    console.warn('[SphereTiltPipeline] No tilt data to log')
    return
  }

  try {
    console.log('\n[SphereTiltPipeline] Tilt angles for all layers:')
    console.table(tiltDataByLayer)

    // Additional analysis: check for symmetry
    const firstLayer = tiltDataByLayer[0]
    const lastLayer = tiltDataByLayer[tiltDataByLayer.length - 1]
    const middleIndex = Math.floor(tiltDataByLayer.length / 2)
    const middleLayer = tiltDataByLayer[middleIndex]

    const firstTilt = firstLayer.tiltDeg
    const lastTilt = lastLayer.tiltDeg
    const tiltDiff = Math.abs(firstTilt - lastTilt)

    console.log('[SphereTiltPipeline] Key observations:', {
      totalLayers: tiltDataByLayer.length,
      firstLayer: {
        index: firstLayer.layerIndex,
        y: firstLayer.y,
        tiltDeg: firstLayer.tiltDeg,
        nodeCount: firstLayer.nodeCount
      },
      middleLayer: {
        index: middleLayer.layerIndex,
        y: middleLayer.y,
        tiltDeg: middleLayer.tiltDeg,
        nodeCount: middleLayer.nodeCount
      },
      lastLayer: {
        index: lastLayer.layerIndex,
        y: lastLayer.y,
        tiltDeg: lastLayer.tiltDeg,
        nodeCount: lastLayer.nodeCount
      },
      symmetryCheck: {
        firstVsLast: `${firstTilt.toFixed(2)}° vs ${lastTilt.toFixed(2)}° (diff: ${tiltDiff.toFixed(2)}°)`,
        expectedSymmetric: tiltDiff < 5
      }
    })
  } catch (err) {
    console.error('[SphereTiltPipeline] Error logging tilt data:', err)
  }
}

/**
 * Create a tilt data entry for a layer.
 * 
 * @param {number} layerIndex - Layer index
 * @param {number} y - Y position of the layer
 * @param {number} radius - Layer radius
 * @param {number} circumference - Layer circumference
 * @param {number} circumferenceRatio - Ratio to max circumference
 * @param {number} radiusDelta - Change from previous layer
 * @param {number} t - Axial offset from sphere center
 * @param {number} thetaRad - Tilt angle in radians
 * @param {number} thetaDeg - Tilt angle in degrees (before ×2)
 * @param {number} nodeCount - Number of nodes in the layer
 * @param {string} stitchType - Stitch type for the layer
 * @returns {object} Tilt data entry
 */
export function createTiltDataEntry({
  layerIndex,
  y,
  radius,
  circumference,
  circumferenceRatio,
  radiusDelta,
  t,
  thetaRad,
  thetaDeg,
  nodeCount,
  stitchType
}) {
  return {
    layerIndex,
    y: Number(y.toFixed(3)),
    radius: Number(radius.toFixed(4)),
    circumference: Number(circumference.toFixed(4)),
    circumferenceRatio,
    radiusDelta,
    t: Number(t.toFixed(4)),
    tiltDeg: Number((thetaDeg * 2).toFixed(2)), // ×2 for display
    baseRollRad: Number(thetaRad.toFixed(6)),
    baseRollDeg: Number((thetaDeg * 2).toFixed(2)), // ×2 for display
    signedRollRad: Number(thetaRad.toFixed(6)),
    signedRollDeg: Number((thetaDeg * 2).toFixed(2)), // ×2 for display
    nodeCount,
    stitchType
  }
}

