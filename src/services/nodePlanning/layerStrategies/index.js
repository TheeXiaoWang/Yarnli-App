import { isClosed } from '../../scaffoldPlanning/helpers/polylineUtils'
import { closedLoopStrategy } from './closedLoopStrategy'
import { openLoopStrategy } from './openLoopStrategy'

/**
 * Detect if a layer is a closed loop or open/cut loop
 * 
 * @param {Object} layer - Layer object with polylines array
 * @returns {boolean} - True if all polylines are closed loops
 */
export function isClosedLayer(layer) {
  const polylines = Array.isArray(layer?.polylines) ? layer.polylines : []
  
  // No polylines means we can't determine - default to closed
  if (polylines.length === 0) return true
  
  // Multiple polylines indicate cut/open arcs
  if (polylines.length > 1) return false
  
  // Single polyline - check if it's closed
  return isClosed(polylines[0])
}

/**
 * Select the appropriate node placement strategy based on layer type
 * 
 * @param {Object} layer - Layer object
 * @returns {Object} - Strategy object with placeNodes method
 */
export function selectStrategy(layer) {
  const closed = isClosedLayer(layer)
  return closed ? closedLoopStrategy : openLoopStrategy
}

/**
 * Apply node placement strategy to a layer
 * 
 * @param {Object} params - Strategy parameters
 * @param {Object} params.layer - Layer object
 * @param {Array} params.nodePositions - Pre-calculated node positions [x,y,z]
 * @param {number} params.nodeCount - Number of nodes to place
 * @param {boolean} params.flipState - Serpentine flip state (for open loops)
 * @param {Array} params.lastAnchor - Last anchor position [x,y,z] for rotation alignment
 * @returns {Object} - { nodes: Array, newFlipState: boolean }
 */
export function applyStrategy(params) {
  const strategy = selectStrategy(params.layer)
  return strategy.placeNodes(params)
}

