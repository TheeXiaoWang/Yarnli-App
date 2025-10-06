// src/services/sphereTiltPipeline/sphereTiltPipeline.js
import { preCalculateLayerData } from './preCalculateLayerData'
import { computeTiltFromRadiusDeltas } from './computeTilt'
import { logTiltData, createTiltDataEntry } from './tiltLogger'

/**
 * Create a sphere tilt pipeline for calculating node rotation/tilt angles.
 * 
 * This pipeline consolidates all sphere-specific tilt calculation logic:
 * - Pre-calculates layer radii and axial positions
 * - Computes tilt angles using squared radius-delta weighting
 * - Collects tilt data for debugging and analysis
 * - Provides logging utilities
 * 
 * @param {object} config - Pipeline configuration
 * @param {Array} config.orderedLayers - Array of layer objects
 * @param {THREE.Vector3} config.sphereCenter - Center of the sphere
 * @param {THREE.Vector3} config.axis - Sphere axis direction (normalized)
 * @param {THREE.Vector3} config.axisOrigin - Origin point on the axis
 * @param {number} config.startKey - Starting position along axis
 * @returns {object} Pipeline interface
 */
export function createSphereTiltPipeline({
  orderedLayers,
  sphereCenter,
  axis,
  axisOrigin,
  startKey
}) {
  // Pre-calculate layer data
  const { allLayerRadii, allLayerAxialPositions } = preCalculateLayerData(
    orderedLayers,
    sphereCenter,
    axis,
    axisOrigin,
    startKey
  )

  // Array to collect tilt data for all layers (for logging)
  const tiltDataByLayer = []

  /**
   * Get tilt angle for a specific layer.
   * 
   * @param {number} layerIndex - Layer index
   * @returns {object} { rollAngle, ratio, cumulativeChange, totalChange, axialPosition }
   */
  function getTiltForLayer(layerIndex) {
    return computeTiltFromRadiusDeltas(layerIndex, allLayerRadii, allLayerAxialPositions)
  }

  /**
   * Add tilt data entry for a layer (for logging).
   * 
   * @param {object} data - Tilt data entry parameters
   */
  function addTiltDataEntry(data) {
    const entry = createTiltDataEntry(data)
    tiltDataByLayer.push(entry)
  }

  /**
   * Log all collected tilt data.
   */
  function logAllTiltData() {
    logTiltData(tiltDataByLayer)
  }

  /**
   * Get all pre-calculated layer radii.
   * 
   * @returns {number[]} Array of layer radii
   */
  function getAllLayerRadii() {
    return allLayerRadii
  }

  /**
   * Get all pre-calculated axial positions.
   * 
   * @returns {number[]} Array of axial positions (t values)
   */
  function getAllLayerAxialPositions() {
    return allLayerAxialPositions
  }

  /**
   * Get the number of layers.
   * 
   * @returns {number} Number of layers
   */
  function getLayerCount() {
    return allLayerRadii.length
  }

  // Return pipeline interface
  return {
    getTiltForLayer,
    addTiltDataEntry,
    logAllTiltData,
    getAllLayerRadii,
    getAllLayerAxialPositions,
    getLayerCount
  }
}

