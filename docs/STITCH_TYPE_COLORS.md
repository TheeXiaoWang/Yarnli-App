# Stitch Type Color-Coding for Development Testing

## Overview

Stitch types now use distinct colors for easy visual identification during development and debugging. This makes it simple to verify that the layer strategy system is correctly assigning stitch types to nodes.

## Implementation Date

2025-10-03

## Color Assignments

### Current Color Scheme

| Stitch Type | Color | Hex Value | Visual Purpose |
|-------------|-------|-----------|----------------|
| **Edge** (`edge`) | Yellow | `0xffff00` | Identify edge layer stitches (first/last layers) |
| **Single Crochet** (`sc`) | Blue | `0x0000ff` | Identify standard working stitches |
| **Chain** (`chain`) | Purple | `0x9467bd` | Identify turning chains in open layers |
| Half Double (`hdc`) | Green | `0x2ca02c` | Standard stitch type |
| Double Crochet (`dc`) | Red | `0xd62728` | Standard stitch type |
| Treble Crochet (`tc`) | Orange | `0xff7f0e` | Standard stitch type |

### Primary Testing Colors

The three most important colors for testing the layer strategy system are:

1. **Yellow (Edge)** - Should appear on the first and last layers
2. **Blue (Single Crochet)** - Should appear on most working stitches
3. **Purple (Chain)** - Should appear on the first 2 stitches of open layers (or last 2 after serpentine reversal)

## How It Works

### 1. Color Definition

Colors are defined in `src/constants/stitchTypes.js`:

```javascript
export const STITCH_TYPES = {
  sc: {
    name: "single crochet",
    widthMul: 1,
    heightMul: 1.0,
    depthMul: 0.7,
    color: 0x0000ff, // Blue for easy visual identification
    // ...
  },
  edge: {
    name: "edge layer",
    widthMul: 0.7,
    heightMul: 1,
    depthMul: 0.6,
    color: 0xffff00, // Yellow for easy visual identification
    // ...
  },
  chain: {
    name: "chain stitch",
    widthMul: 0.5,
    heightMul: 1.2,
    depthMul: 0.3,
    color: 0x9467bd, // Purple color to distinguish from sc
    // ...
  },
}
```

### 2. Node Data Flow

The stitch type information flows through the system as follows:

1. **Node Creation** - Nodes are created with `stitchType` property by the layer strategies:
   ```javascript
   {
     id: 0,
     p: [x, y, z],
     stitchType: 'chain', // or 'sc', 'edge', etc.
   }
   ```

2. **Data Extraction** - `NodeViewer.jsx` extracts the stitch type from each node:
   ```javascript
   if (n?.stitchType) {
     entry.stitchType = n.stitchType
   }
   ```

3. **Profile Lookup** - The rendering component looks up the stitch profile:
   ```javascript
   const profile = stitchProfile || STITCH_TYPES[stitchType] || STITCH_TYPES.sc
   ```

4. **Color Application** - The color is applied to the material:
   ```javascript
   <meshStandardMaterial color={profile.color ?? 0x1f77b4} />
   ```

### 3. Rendering Pipeline

The rendering happens in `src/ui/editor/NodeViewer.jsx`:

- **Component**: `OrientedNode` (lines 149-208)
- **Color Property**: `profile.color` (line 205)
- **Fallback Color**: `0x1f77b4` (blue) if no color is defined

## Testing the Layer Strategy System

### Visual Verification Checklist

When viewing a 3D model with the layer strategy system active, you should see:

#### ✅ Closed Loop Layers
- All nodes should be **blue** (single crochet)
- No yellow (edge) or purple (chain) stitches
- Sequential ordering around the loop

#### ✅ Open Loop Layers (Forward)
- First 2 nodes should be **purple** (chain stitches)
- Remaining nodes should be **blue** (single crochet)
- Nodes arranged left-to-right along the arc

#### ✅ Open Loop Layers (Reversed - Serpentine)
- Last 2 nodes should be **purple** (chain stitches)
- Remaining nodes should be **blue** (single crochet)
- Nodes arranged right-to-left along the arc (reversed)

#### ✅ Edge Layers
- All nodes should be **yellow** (edge stitches)
- Typically appears on first and last layers

### Example Test Scenarios

**Scenario 1: Consecutive Closed Loops**
```
Layer 0 (closed): All blue nodes in circular pattern
Layer 1 (closed): All blue nodes in circular pattern
Layer 2 (closed): All blue nodes in circular pattern
```

**Scenario 2: Consecutive Open Loops**
```
Layer 0 (open, forward):  [Purple, Purple, Blue, Blue, Blue, Blue]
Layer 1 (open, reversed): [Blue, Blue, Blue, Blue, Purple, Purple]
Layer 2 (open, forward):  [Purple, Purple, Blue, Blue, Blue, Blue]
```

**Scenario 3: Mixed Closed and Open**
```
Layer 0 (closed): All blue nodes
Layer 1 (open):   [Purple, Purple, Blue, Blue, Blue]
Layer 2 (open):   [Blue, Blue, Blue, Purple, Purple] (reversed)
Layer 3 (closed): All blue nodes
```

## Debugging Tips

### 1. Enable Console Logging

The `OrientedNode` component logs stitch type information for the first 3 nodes in development mode:

```javascript
if (import.meta?.env?.DEV && idx < 3) {
  console.log(`[Node ${idx}] stitchType: ${stitchType}, profile:`, profile)
}
```

### 2. Check Node Data

Inspect the node data in the browser console:
```javascript
// In browser console
useNodeStore.getState().nextLayersPoints
```

### 3. Verify Stitch Type Assignment

Check that nodes have the correct `stitchType` property:
```javascript
// Expected structure
{
  id: 0,
  p: [x, y, z],
  stitchType: 'chain', // Should be 'chain', 'sc', 'edge', etc.
  tangent: [tx, ty, tz],
  normal: [nx, ny, nz],
}
```

### 4. Color Not Showing?

If colors aren't displaying correctly:

1. **Check stitch type is set**: Verify nodes have `stitchType` property
2. **Check profile lookup**: Ensure `STITCH_TYPES[stitchType]` exists
3. **Check color value**: Verify the color hex value is correct
4. **Check material**: Ensure `meshStandardMaterial` is using `profile.color`

## Files Modified

1. **`src/constants/stitchTypes.js`**
   - Updated `sc.color` from `0x1f77b4` to `0x0000ff` (blue)
   - Updated `edge.color` from `0x1f77b4` to `0xffff00` (yellow)
   - Verified `chain.color` is `0x9467bd` (purple)

2. **`src/ui/editor/NodeViewer.jsx`**
   - Already correctly uses `profile.color` for node rendering
   - No changes needed (system was already set up correctly)

## Benefits

1. **Visual Debugging** - Instantly see which stitch types are assigned to which nodes
2. **Strategy Verification** - Confirm that layer strategies are working correctly
3. **Serpentine Pattern** - Easily verify that chain stitches are in the correct positions
4. **Edge Detection** - Quickly identify edge layers
5. **Development Speed** - Faster iteration and testing of new features

## Future Enhancements

1. **Configurable Colors** - Allow users to customize stitch type colors in settings
2. **Color Legend** - Add a UI legend showing which colors represent which stitch types
3. **Highlight Mode** - Toggle to highlight specific stitch types
4. **Color Gradients** - Use gradients to show stitch progression within a layer
5. **Debug Overlay** - Show stitch type labels on hover

## Related Documentation

- `docs/LAYER_STRATEGIES.md` - Layer strategy system architecture
- `docs/IMPLEMENTATION_SUMMARY.md` - Layer-specific node placement implementation
- `src/constants/stitchTypes.js` - Stitch type definitions
- `src/ui/editor/NodeViewer.jsx` - Node rendering component

