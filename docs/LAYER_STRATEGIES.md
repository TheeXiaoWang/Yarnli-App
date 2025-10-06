# Layer-Type-Specific Node Placement Strategies

## Overview

This document describes the layer-type-specific node placement system that handles different crochet construction patterns for closed loops vs. open/cut loops.

## Architecture

### Directory Structure

```
src/services/nodePlanning/layerStrategies/
├── index.js                    # Strategy selector and utilities
├── closedLoopStrategy.js       # Closed loop node placement
└── openLoopStrategy.js         # Open loop node placement (serpentine + chain stitches)
```

### Integration Points

The strategy system is integrated into `src/services/scaffoldPlanning/planScaffoldChain.js`:

1. **Layer Type Detection**: Uses `isClosedLayer(layer)` to determine if a layer is closed or open
2. **Node Count Adjustment**: Adds 2 chain stitches for open layers
3. **Strategy Application**: Calls `applyStrategy()` to apply layer-specific logic
4. **Serpentine State Management**: Maintains flip state across consecutive open layers

## Layer Types

### Closed Loop Layers

**Characteristics:**
- Complete rings (polyline start point equals end point)
- Single polyline in `layer.polylines` array
- All nodes are working stitches (no chain stitches)

**Node Placement:**
- Sequential ordering: 0 → 1 → 2 → ... → N-1
- All nodes follow the same rotational direction (clockwise/counterclockwise)
- Flip state is always reset to `false` for next layer

**Example:**
```javascript
Layer 0 (closed): [0→1→2→3→4] (clockwise)
Layer 1 (closed): [0→1→2→3→4] (clockwise)
Layer 2 (closed): [0→1→2→3→4] (clockwise)
```

### Open Loop Layers (Cut Layers)

**Characteristics:**
- Multiple open polylines (arcs with gaps)
- `layer.polylines.length > 1`
- Includes chain stitches for turning

**Node Placement:**
- **Serpentine ordering**: Consecutive open layers alternate direction
- **Chain stitches**: 2 chain stitch nodes inserted at the beginning
- **Node structure**: `[chain, chain, sc, sc, sc, ...]`
- **Flip state**: Toggles for each consecutive open layer

**Example:**
```javascript
// After ID reassignment by reassignIdsSequential()
Layer 0 (open): [0(chain)→1(chain)→2(sc)→3(sc)→4(sc)] (forward)
Layer 1 (open): [0(sc)→1(sc)→2(sc)→3(chain)→4(chain)] (reversed - chains at end)
Layer 2 (open): [0(chain)→1(chain)→2(sc)→3(sc)→4(sc)] (forward again)
```

**Note:** The reversal affects the entire node array, so chain stitches end up at the end of reversed rows. This matches real crochet where turning chains are worked at the end of a row before turning to work back.

### Mixed Layers

When transitioning from closed to open or vice versa, the flip state is properly managed:

**Example:**
```javascript
Layer 0 (closed): [0→1→2→3→4] (forward, flip state reset to false)
Layer 1 (open):   [0(chain)→1(chain)→2(sc)→3(sc)→4(sc)] (forward, flip state = false)
Layer 2 (open):   [0(sc)→1(sc)→2(sc)→3(chain)→4(chain)] (reversed, flip state = true)
Layer 3 (closed): [0→1→2→3→4] (forward, flip state reset to false)
```

## Chain Stitch Type

A new stitch type `'chain'` has been added to `src/constants/stitchTypes.js`:

```javascript
chain: {
  name: "chain stitch",
  widthMul: 0.5,   // Thinner than sc (chains are narrow)
  heightMul: 1.2,  // Slightly taller than sc
  depthMul: 0.3,   // Very thin depth (chains are flat)
  color: 0x9467bd, // Purple color to distinguish from sc
}
```

## Implementation Details

### Strategy Selection

```javascript
import { applyStrategy, isClosedLayer } from '../nodePlanning/layerStrategies'

const isOpen = !isClosedLayer(layer)
const chainStitchCount = isOpen ? 2 : 0
const totalNodeCount = nextCount + chainStitchCount
```

### Strategy Application

```javascript
const strategyResult = applyStrategy({
  layer,
  nodePositions,      // Pre-calculated positions from buildScaffoldStep
  nodeCount: totalNodeCount,
  flipState: serpentineFlipState,
  lastAnchor: lastAnchorNode0,
  stitchType,
})

let adjusted = strategyResult.nodes
serpentineFlipState = strategyResult.newFlipState
```

### Node Structure

Each node returned by the strategy has:

```javascript
{
  id: number,           // Sequential ID (0, 1, 2, ...)
  p: [x, y, z],        // Position in 3D space
  stitchType: string,  // 'chain', 'sc', 'edge', etc.
}
```

## Rationale

### Why Serpentine for Open Loops?

In real crochet, when working back and forth across open rows, you don't break the yarn and restart at the same end. Instead, you work to the end of the row, turn, and work back in the opposite direction. This is more efficient and creates a continuous fabric.

### Why Chain Stitches at Edges?

Chain stitches at the beginning of each open row serve as "turning chains" that provide height for the next row. This is standard crochet technique for flat pieces.

### Why Reset Flip State for Closed Loops?

Closed loops are worked in a continuous spiral or joined rounds, always in the same direction. There's no "turning" involved, so the flip state should be reset when transitioning from open to closed layers.

## Testing

### Test Case 1: Consecutive Closed Loops
```
Input: 3 closed loop layers
Expected: All layers have sequential ordering (0→1→2→3→4)
Expected: No chain stitches
Expected: Flip state remains false
```

### Test Case 2: Consecutive Open Loops
```
Input: 3 open loop layers
Expected: Layer 0: [0(chain)→1(chain)→2(sc)→3(sc)→4(sc)] (forward)
Expected: Layer 1: [0(sc)→1(sc)→2(sc)→3(chain)→4(chain)] (reversed - chains at end)
Expected: Layer 2: [0(chain)→1(chain)→2(sc)→3(sc)→4(sc)] (forward again)
Expected: Each layer has 2 chain stitches
Expected: Flip state alternates: false → true → false
```

### Test Case 3: Mixed Closed and Open
```
Input: Closed → Open → Open → Closed
Expected: Flip state resets when transitioning to closed
Expected: Chain stitches only on open layers
Expected: Proper serpentine pattern for consecutive open layers
```

## Future Enhancements

1. **Configurable Chain Count**: Allow users to specify number of turning chains (1, 2, or 3)
2. **Edge Stitch Handling**: Special handling for first/last stitches in open rows
3. **Join vs. Spiral**: Support for joined rounds vs. continuous spiral in closed loops
4. **Custom Strategies**: Plugin system for user-defined layer strategies

## Related Files

- `src/services/scaffoldPlanning/planScaffoldChain.js` - Main integration point
- `src/services/scaffoldPlanning/buildStep.js` - Node position calculation
- `src/services/scaffoldPlanning/helpers/polylineUtils.js` - Layer type detection utilities
- `src/constants/stitchTypes.js` - Stitch type definitions
- `src/services/nodes/buildNodes.js` - Node quaternion and orientation calculation

