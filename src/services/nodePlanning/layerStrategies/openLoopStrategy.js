/**
 * Open Loop Strategy
 *
 * Handles node placement for open/cut loop layers (arcs with gaps).
 * - Consecutive open layers alternate direction (serpentine pattern)
 * - First 2 nodes are marked as chain stitches, rest as working stitches
 * - If flip state is true, reverses the ENTIRE node array (serpentine pattern)
 * - After reversal, chain stitches end up at the end of the row
 * - Flip state toggles for each consecutive open layer
 *
 * Example:
 * - Layer 1 (flipState=false): [0(chain), 1(chain), 2(sc), 3(sc), 4(sc)] → forward
 * - Layer 2 (flipState=true):  [0(chain), 1(chain), 2(sc), 3(sc), 4(sc)] → reversed to [4(sc), 3(sc), 2(sc), 1(chain), 0(chain)]
 * - After ID reassignment:      [0(sc), 1(sc), 2(sc), 3(chain), 4(chain)]
 */

const CHAIN_STITCH_COUNT = 2

/**
 * Place nodes for an open loop layer
 *
 * @param {Object} params
 * @param {Object} params.layer - Layer object
 * @param {Array} params.nodePositions - Pre-calculated node positions [[x,y,z], ...] OR full node objects
 * @param {number} params.nodeCount - Total number of nodes (including chain stitches)
 * @param {boolean} params.flipState - Current serpentine flip state
 * @param {Array} params.lastAnchor - Last anchor position [x,y,z] for rotation alignment
 * @param {string} params.stitchType - Default stitch type for working stitches (e.g., 'sc')
 * @returns {Object} - { nodes: Array<{id, p, stitchType, quaternion?, theta?, ...}>, newFlipState: boolean }
 */
export function placeNodes(params) {
  const {
    nodePositions = [],
    flipState = false,
    stitchType = 'sc',
  } = params

  if (nodePositions.length < CHAIN_STITCH_COUNT) {
    // Not enough nodes for chain stitches - fallback to all working stitches
    const nodes = nodePositions.map((nodeOrPos, i) => {
      const isFullNode = nodeOrPos && typeof nodeOrPos === 'object' && !Array.isArray(nodeOrPos)

      if (isFullNode) {
        return {
          ...nodeOrPos,
          id: i,
          stitchType: stitchType,
        }
      } else {
        const p = Array.isArray(nodeOrPos) ? nodeOrPos : [nodeOrPos[0], nodeOrPos[1], nodeOrPos[2]]
        return {
          id: i,
          p,
          stitchType: stitchType,
        }
      }
    })
    return { nodes, newFlipState: !flipState }
  }

  // Build nodes array with proper stitch types
  // First 2 nodes are chain stitches, rest are working stitches
  const nodes = nodePositions.map((nodeOrPos, i) => {
    // Check if input is a full node object or just a position array
    const isFullNode = nodeOrPos && typeof nodeOrPos === 'object' && !Array.isArray(nodeOrPos)

    if (isFullNode) {
      // Preserve all properties from the original node (quaternion, theta, tangent, normal, etc.)
      return {
        ...nodeOrPos,
        id: i,
        stitchType: i < CHAIN_STITCH_COUNT ? 'chain' : stitchType,
      }
    } else {
      // Legacy path: just a position array
      const p = Array.isArray(nodeOrPos) ? nodeOrPos : [nodeOrPos[0], nodeOrPos[1], nodeOrPos[2]]
      return {
        id: i,
        p,
        stitchType: i < CHAIN_STITCH_COUNT ? 'chain' : stitchType,
      }
    }
  })

  // If flip state is true, reverse the ENTIRE array (serpentine pattern)
  // This matches real crochet where you work back across the row
  const orderedNodes = flipState ? nodes.slice().reverse() : nodes

  // Toggle flip state for next open layer
  return {
    nodes: orderedNodes,
    newFlipState: !flipState,
  }
}

export const openLoopStrategy = {
  placeNodes,
}

