# Stitch-Type-Aware Node Spacing

## Overview

Implemented automatic spacing adjustment for nodes based on their individual stitch types. This ensures constant edge-to-edge gaps between nodes regardless of whether they are chain stitches, single crochet, edge stitches, or other types.

## Implementation Date

2025-10-03

## Problem Statement

### Previous Behavior

The node spacing calculation assumed all nodes were single crochet stitches and used uniform spacing based on single crochet dimensions. This caused issues when layers contained mixed stitch types:

- **Edge stitches** (`widthMul: 0.7`) are narrower than single crochet (`widthMul: 1.0`)
- **Chain stitches** (`widthMul: 0.5`) are even narrower
- Uniform spacing caused edge nodes and chain nodes to appear with incorrect spacing (too far apart or too close together)

### Example Problem

For an open layer with 2 chain stitches and 3 single crochet stitches:

```
OLD BEHAVIOR (uniform spacing):
[Chain] ←─ gap ─→ [Chain] ←─ gap ─→ [SC] ←─ gap ─→ [SC] ←─ gap ─→ [SC]
  0.5x              0.5x              1.0x          1.0x          1.0x

All gaps are the same size, but chain stitches are narrower!
Result: Large visible gaps around chain stitches, tight gaps around SC stitches
```

```
NEW BEHAVIOR (stitch-type-aware spacing):
[Chain] ←gap→ [Chain] ←─ gap ─→ [SC] ←─ gap ─→ [SC] ←─ gap ─→ [SC]
  0.5x           0.5x              1.0x          1.0x          1.0x

Gaps are adjusted so edge-to-edge distance is constant!
Result: Uniform visual gaps between all stitches
```

## Solution

### Core Formula

The spacing system maintains constant edge-to-edge gaps using this formula:

```
centerSpacing = edgeGap + visualWidth

Where:
- edgeGap = baseYarnWidth × edgeGapRatio (constant for all nodes)
- visualWidth = baseYarnWidth × widthMul (varies by stitch type)
```

### Implementation Approach

1. **Node positions are generated** with uniform spacing by `buildScaffoldStep`
2. **Layer strategy assigns stitch types** to each node (chain, sc, edge, etc.)
3. **Spacing adjustment function** redistributes nodes to maintain constant edge gaps
4. **Final positions** reflect proper spacing for each stitch type

## Architecture

### Key Files

1. **`src/services/nodePlanning/adjustNodeSpacing.js`** (NEW)
   - `adjustNodeSpacingByStitchType()` - Main adjustment function
   - `adjustNodeSpacingCircular()` - Circular ring adjustment
   - `adjustNodeSpacingLinear()` - Linear arc adjustment
   - `calculateNodeSpacingScaleFactor()` - Debugging utility

2. **`src/domain/layerlines/resampleByStitchWidth.js`** (NEW)
   - `resamplePolylineByStitchWidth()` - Resample polyline with stitch-aware spacing
   - `calculateStitchWidthScaleFactor()` - Calculate scale factor
   - `validateStitchWidthSpacing()` - Validation utility

3. **`src/services/scaffoldPlanning/planScaffoldChain.js`** (MODIFIED)
   - Added spacing adjustment after strategy application
   - Only applies to open layers (mixed stitch types)

4. **`src/constants/stitchTypes.js`** (REFERENCE)
   - Contains `widthMul` values for each stitch type

### Data Flow

```
1. buildScaffoldStep()
   ↓
   Generates node positions with UNIFORM spacing
   ↓
2. applyStrategy()
   ↓
   Assigns stitch types to each node
   ↓
3. adjustNodeSpacingByStitchType()
   ↓
   Redistributes nodes based on stitch type widths
   ↓
4. Final nodes with CONSTANT edge-to-edge gaps
```

## How It Works

### Step 1: Calculate Required Spacing

For each node, calculate the center-to-center spacing based on its stitch type:

```javascript
const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
const widthMul = profile.widthMul ?? 1.0
const visualWidth = baseYarnWidth * widthMul
const edgeGap = baseYarnWidth * edgeGapRatio
const centerSpacing = edgeGap + visualWidth
```

### Step 2: Calculate Scale Factor

Compare total required length vs. available arc length:

```javascript
const totalRequiredLength = centerSpacings.reduce((sum, s) => sum + s, 0)
const totalCurrentLength = /* sum of distances between current nodes */
const scaleFactor = totalCurrentLength / totalRequiredLength
```

### Step 3: Redistribute Nodes

For circular rings (closed loops):
- Use angular distribution around center point
- Maintain constant edge-to-edge gaps in arc length

For linear arcs (open loops):
- Redistribute along existing arc path
- Maintain constant edge-to-edge gaps

## Examples

### Example 1: Open Layer (Forward)

```javascript
// Input: 2 chain + 3 sc stitches
stitchTypes = ['chain', 'chain', 'sc', 'sc', 'sc']

// Stitch widths (relative to base yarn width)
widths = [0.5, 0.5, 1.0, 1.0, 1.0]

// Required center spacings (edgeGap = 0.2 × baseWidth)
centerSpacings = [0.7, 0.7, 1.2, 1.2, 1.2]

// Total required: 4.9 units
// Available arc: 5.0 units
// Scale factor: 1.02 (fits comfortably)

// Result: Nodes redistributed with proper spacing
```

### Example 2: Open Layer (Reversed - Serpentine)

```javascript
// After serpentine reversal:
stitchTypes = ['sc', 'sc', 'sc', 'chain', 'chain']

// Stitch widths
widths = [1.0, 1.0, 1.0, 0.5, 0.5]

// Required center spacings
centerSpacings = [1.2, 1.2, 1.2, 0.7, 0.7]

// Same total required: 4.9 units
// Chain stitches now at the END of the arc
```

### Example 3: Edge Layer

```javascript
// All edge stitches
stitchTypes = ['edge', 'edge', 'edge', 'edge', 'edge', 'edge']

// Stitch widths (edge is 0.7× sc width)
widths = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7]

// Required center spacings
centerSpacings = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9]

// Nodes packed tighter than sc layers
```

## Configuration

### Edge Gap Ratio

The constant edge-to-edge gap is controlled by `DEFAULT_EDGE_GAP_RATIO`:

```javascript
// In src/services/nodePlanning/dynamicSpacing.js
export const DEFAULT_EDGE_GAP_RATIO = 0.2  // 20% of base yarn width
```

Adjust this value to control gap size:
- **Lower values (0.1-0.15)**: Tighter packing, smaller gaps
- **Higher values (0.25-0.35)**: Looser packing, larger gaps

### Stitch Type Widths

Defined in `src/constants/stitchTypes.js`:

```javascript
{
  sc: { widthMul: 1.0 },      // Baseline
  edge: { widthMul: 0.7 },    // 70% of sc width
  chain: { widthMul: 0.5 },   // 50% of sc width
  hdc: { widthMul: 1.0 },     // Same as sc
  dc: { widthMul: 1.0 },      // Same as sc
  tc: { widthMul: 1.0 },      // Same as sc
}
```

## Testing

### Visual Verification

When viewing a 3D model with mixed stitch types:

1. **Open layers (forward)**: Chain stitches (purple) should be closer together at the start
2. **Open layers (reversed)**: Chain stitches (purple) should be closer together at the end
3. **Edge layers**: All yellow nodes should be evenly spaced but tighter than sc layers
4. **Edge-to-edge gaps**: Visual gaps between nodes should appear constant

### Debug Logging

Enable console logging to verify spacing calculations:

```javascript
// In adjustNodeSpacing.js, add:
console.log('Spacing adjustment:', {
  stitchTypes,
  centerSpacings,
  scaleFactor,
  totalRequiredLength,
  totalCurrentLength,
})
```

### Validation Function

Use the validation utility to check spacing:

```javascript
import { calculateNodeSpacingScaleFactor } from './adjustNodeSpacing'

const result = calculateNodeSpacingScaleFactor(nodes, baseYarnWidth)
console.log('Scale factor:', result.scaleFactor)
console.log('Fits?', result.fits)
```

## Limitations

### Current Limitations

1. **Open layers only**: Spacing adjustment currently only applies to open layers
   - Closed layers with uniform stitch types don't need adjustment
   - Could be extended to closed layers with mixed types if needed

2. **Circular approximation**: For closed rings, assumes circular distribution
   - Works well for nearly-circular rings
   - May be less accurate for highly elliptical rings

3. **No per-arc adjustment**: For CUT rings (multiple open arcs), adjustment is not yet implemented
   - Each arc would need independent spacing adjustment
   - Future enhancement

### Known Edge Cases

1. **Very tight packing**: If total required length > available arc length, nodes are compressed
   - Scale factor < 1.0
   - Edge gaps become smaller than desired
   - Consider increasing arc length or reducing node count

2. **Single stitch type**: If all nodes have the same stitch type, adjustment is skipped
   - No performance overhead for uniform layers
   - Optimization for common case

## Performance

### Computational Complexity

- **Time complexity**: O(n) where n = number of nodes
- **Space complexity**: O(n) for adjusted node array
- **Overhead**: Minimal, only runs for open layers with mixed stitch types

### Optimization

The adjustment is skipped when:
- Layer is closed (all same stitch type)
- All nodes have the same stitch type
- Only one node in the layer

## Future Enhancements

1. **Per-arc adjustment for CUT rings**: Apply spacing adjustment to each arc independently
2. **Elliptical ring support**: Better handling of non-circular closed rings
3. **Custom gap ratios per stitch type**: Allow different edge gaps for different stitch types
4. **Adaptive compression**: Better handling when nodes don't fit in available arc length
5. **Visual debugging**: Overlay showing edge-to-edge gaps in the 3D view

## Related Documentation

- `docs/LAYER_STRATEGIES.md` - Layer strategy system
- `docs/STITCH_TYPE_COLORS.md` - Color-coding for visual verification
- `docs/IMPLEMENTATION_SUMMARY.md` - Layer-specific node placement
- `src/services/nodePlanning/dynamicSpacing.js` - Spacing calculation logic
- `src/constants/stitchTypes.js` - Stitch type definitions

