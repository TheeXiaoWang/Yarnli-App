import * as THREE from 'three'

/**
 * Filter out small/fragmented layer segments to improve visual quality
 * @param {Array} layers - Array of layer objects with polylines
 * @param {Object} options - Filtering options
 * @param {number} options.minPerimeterRatio - Minimum perimeter ratio (0.0 to 1.0) relative to original layer
 * @returns {Array} Filtered layers with small fragments removed
 */
export function filterLayerFragments(layers, options = {}) {
  const { minPerimeterRatio = 0.2 } = options
  
  if (!Array.isArray(layers) || layers.length === 0) {
    return layers
  }

  const filtered = []
  let totalFragments = 0
  let removedFragments = 0
  
  for (const layer of layers) {
    if (!layer?.polylines || !Array.isArray(layer.polylines)) {
      filtered.push(layer)
      continue
    }

    // Calculate original layer perimeter (approximate from first polyline)
    const originalPoly = layer.polylines[0]
    if (!originalPoly || originalPoly.length < 2) {
      filtered.push(layer)
      continue
    }

    const originalPerimeter = calculatePolylinePerimeter(originalPoly)
    if (originalPerimeter <= 0) {
      filtered.push(layer)
      continue
    }

    // Filter polylines based on perimeter ratio
    const filteredPolylines = layer.polylines.filter(poly => {
      if (!poly || poly.length < 2) return false
      
      const fragmentPerimeter = calculatePolylinePerimeter(poly)
      const ratio = fragmentPerimeter / originalPerimeter
      
      totalFragments++
      if (ratio < minPerimeterRatio) {
        removedFragments++
        return false
      }
      
      return true
    })

    // Only keep layers that have meaningful fragments after filtering
    if (filteredPolylines.length > 0) {
      filtered.push({
        ...layer,
        polylines: filteredPolylines
      })
    }
  }

  // Log filtering results for debugging
  if (totalFragments > 0) {
    console.log(`[FragmentFilter] Filtered ${totalFragments} fragments, removed ${removedFragments} small fragments (ratio < ${minPerimeterRatio})`)
  }

  return filtered
}

/**
 * Calculate the perimeter of a polyline
 * @param {Array} polyline - Array of [x, y, z] points
 * @returns {number} Total perimeter length
 */
function calculatePolylinePerimeter(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) {
    return 0
  }

  let totalLength = 0
  
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i]
    const p2 = polyline[i + 1]
    
    if (Array.isArray(p1) && Array.isArray(p2) && p1.length >= 3 && p2.length >= 3) {
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      const dz = p2[2] - p1[2]
      totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
  }

  return totalLength
}
