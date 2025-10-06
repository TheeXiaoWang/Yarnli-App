// src/services/sphereTiltPipeline/preCalculateLayerData.js
import * as THREE from 'three'
import { polylineLengthProjected, ringMetricsAlongAxisFromPoints } from '../../domain/layerlines/circumference'

/**
 * Pre-calculate layer radii and axial positions for all layers.
 * 
 * This function extracts the radius and axial position (t value) for each layer,
 * which are needed for the tilt calculation pipeline.
 * 
 * @param {Array} orderedLayers - Array of layer objects with polylines
 * @param {THREE.Vector3} sphereCenter - Center of the sphere
 * @param {THREE.Vector3} axis - Sphere axis direction (normalized)
 * @param {THREE.Vector3} axisOrigin - Origin point on the axis
 * @param {number} startKey - Starting position along axis
 * @returns {object} { allLayerRadii, allLayerAxialPositions }
 */
export function preCalculateLayerData(orderedLayers, sphereCenter, axis, axisOrigin, startKey) {
  const allLayerRadii = []
  const allLayerAxialPositions = []
  const centerV = sphereCenter.clone()
  const n = axis.clone().normalize()

  for (let i = 0; i < orderedLayers.length; i++) {
    const layer = orderedLayers[i].layer
    let yTmp = Number(layer.y)
    const polyTmp = layer?.polylines?.[0]

    // Use same logic as main loop to calculate radius
    if (Array.isArray(polyTmp) && polyTmp.length > 0) {
      const mid = polyTmp[Math.floor(polyTmp.length / 2)]
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
        const delta = mv.clone().sub(centerV)
        yTmp = startKey + n.dot(delta)
      }
    }

    const centerAtTmp = axisOrigin.clone().add(n.clone().multiplyScalar(yTmp))
    const projectedCircTmp = Array.isArray(polyTmp)
      ? polylineLengthProjected(
          polyTmp,
          [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z],
          [n.x, n.y, n.z]
        )
      : 0
    const rTmp =
      projectedCircTmp > 0
        ? projectedCircTmp / (2 * Math.PI)
        : ringMetricsAlongAxisFromPoints(
            polyTmp || [],
            [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z],
            [n.x, n.y, n.z]
          ).radius || 1

    // Calculate axial offset from sphere center (t value)
    // This is the geometric position along the sphere axis
    const tTmp = yTmp - startKey // Axial distance from sphere center along axis

    allLayerRadii.push(rTmp)
    allLayerAxialPositions.push(tTmp)
  }

  // Log arrays for debugging
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.log('[SphereTiltPipeline] Pre-calculated layer radii:', allLayerRadii)
    console.log('[SphereTiltPipeline] Pre-calculated axial positions (t):', allLayerAxialPositions)
  }

  return { allLayerRadii, allLayerAxialPositions }
}

