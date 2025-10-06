/**
 * Closed Loop Strategy
 * 
 * Handles node placement for closed loop layers (complete rings).
 * - All nodes follow the same rotational direction (clockwise/counterclockwise)
 * - No chain stitches
 * - Sequential node IDs (0, 1, 2, ..., N-1)
 * - Flip state is always reset to false for next layer
 */

/**
 * Place nodes for a closed loop layer
 *
 * @param {Object} params
 * @param {Object} params.layer - Layer object
 * @param {Array} params.nodePositions - Pre-calculated node positions [[x,y,z], ...] OR full node objects
 * @param {number} params.nodeCount - Number of nodes
 * @param {boolean} params.flipState - Current serpentine flip state (ignored for closed loops)
 * @param {Array} params.lastAnchor - Last anchor position [x,y,z] for rotation alignment
 * @param {string} params.stitchType - Default stitch type (e.g., 'sc', 'edge')
 * @returns {Object} - { nodes: Array<{id, p, stitchType, quaternion?, theta?, ...}>, newFlipState: boolean }
 */
export function placeNodes(params) {
  const {
    nodePositions = [],
    stitchType = 'sc',
  } = params

  // For closed loops, all nodes are working stitches (no chain stitches)
  // Sequential ordering: 0 → 1 → 2 → ... → N-1
  const nodes = nodePositions.map((nodeOrPos, i) => {
    // Check if input is a full node object or just a position array
    const isFullNode = nodeOrPos && typeof nodeOrPos === 'object' && !Array.isArray(nodeOrPos)

    if (isFullNode) {
      // Preserve all properties from the original node (quaternion, theta, tangent, normal, etc.)
      return {
        ...nodeOrPos,
        id: i,
        stitchType: stitchType,
      }
    } else {
      // Legacy path: just a position array
      const p = Array.isArray(nodeOrPos) ? nodeOrPos : [nodeOrPos[0], nodeOrPos[1], nodeOrPos[2]]
      return {
        id: i,
        p,
        stitchType: stitchType,
      }
    }
  })

  // Closed loops always reset flip state to false
  return {
    nodes,
    newFlipState: false,
  }
}

export const closedLoopStrategy = {
  placeNodes,
}

