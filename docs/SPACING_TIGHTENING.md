# Node Spacing Tightening

## Issue

**Problem:** Nodes were spaced too far apart, creating excessive gaps between stitches.

**Visual Impact:** 
- Large visible gaps between nodes
- Loose, spread-out appearance
- Not representative of tight crochet stitches

## Solution

Reduced spacing by adjusting two key parameters:

### 1. Edge Gap Ratio

**File:** `src/services/nodePlanning/dynamicSpacing.js`

**Change:**
```javascript
// BEFORE:
export const DEFAULT_EDGE_GAP_RATIO = 0.2  // 20% gap

// AFTER:
export const DEFAULT_EDGE_GAP_RATIO = 0.05  // 5% gap (4x tighter)
```

**Impact:** Reduces the edge-to-edge gap between nodes from 20% to 5% of base yarn width.

### 2. Packing Factor

**File:** `src/services/scaffoldPlanning/planScaffoldChain.js`

**Change:**
```javascript
// BEFORE:
const PF = 0.9  // 90% of calculated spacing

// AFTER:
const PF = 0.75  // 75% of calculated spacing (tighter)
```

**Impact:** Further compresses node spacing by using only 75% of the calculated center-to-center distance.

## Combined Effect

### Before
- Edge gap: 20% of yarn width
- Packing factor: 90%
- **Effective spacing: 0.9 × (0.2 + 1.0) = 1.08 × yarn width**

### After
- Edge gap: 5% of yarn width
- Packing factor: 75%
- **Effective spacing: 0.75 × (0.05 + 1.0) = 0.79 × yarn width**

### Result
**Nodes are now ~27% closer together** (1.08 → 0.79)

## Technical Details

### Spacing Formula

```
centerSpacing = (edgeGap + visualWidth) × packingFactor

Where:
- edgeGap = baseYarnWidth × DEFAULT_EDGE_GAP_RATIO
- visualWidth = baseYarnWidth × widthMul
- packingFactor = PF (packing factor)
```

### Example Calculation (Single Crochet, widthMul = 1.0)

**Before:**
```
edgeGap = 0.5 × 0.2 = 0.1
visualWidth = 0.5 × 1.0 = 0.5
centerSpacing = (0.1 + 0.5) × 0.9 = 0.54
```

**After:**
```
edgeGap = 0.5 × 0.05 = 0.025
visualWidth = 0.5 × 1.0 = 0.5
centerSpacing = (0.025 + 0.5) × 0.75 = 0.394
```

**Reduction:** 0.54 → 0.394 = **27% tighter**

## Files Modified

### 1. `src/services/nodePlanning/dynamicSpacing.js`
- **Line 43:** Changed `DEFAULT_EDGE_GAP_RATIO` from 0.2 to 0.05
- **Updated documentation** to reflect new tight packing values

### 2. `src/services/scaffoldPlanning/planScaffoldChain.js`
- **Line 93:** Changed packing factor `PF` from 0.9 to 0.75
- **Added comment** explaining tighter packing

## Build Status

✅ **Build succeeded** with no errors

```bash
npm run build
✓ 2312 modules transformed.
✓ built in 9.89s
```

## Testing

### Visual Verification

1. **Regenerate nodes** for an existing object
2. **Expected results:**
   - Nodes should be much closer together
   - Minimal gaps between node edges
   - Tighter, more compact appearance
   - Better representation of actual crochet stitches

### Comparison

**Before:**
- Large gaps visible between nodes
- Loose, spread-out rings
- Nodes appear disconnected

**After:**
- Minimal gaps between nodes
- Tight, compact rings
- Nodes appear connected and cohesive

## Adjusting Tightness

If you need to fine-tune the spacing further:

### Make it TIGHTER
```javascript
// In dynamicSpacing.js:
export const DEFAULT_EDGE_GAP_RATIO = 0.02  // Even tighter (2% gap)

// In planScaffoldChain.js:
const PF = 0.7  // Even more compression
```

### Make it LOOSER
```javascript
// In dynamicSpacing.js:
export const DEFAULT_EDGE_GAP_RATIO = 0.1  // Looser (10% gap)

// In planScaffoldChain.js:
const PF = 0.85  // Less compression
```

### Recommended Ranges

**Edge Gap Ratio:**
- Very tight: 0.02 - 0.05
- Moderate: 0.1 - 0.15
- Loose: 0.2 - 0.3

**Packing Factor:**
- Very tight: 0.7 - 0.75
- Moderate: 0.8 - 0.85
- Loose: 0.9 - 0.95

## Impact on Different Stitch Types

The tighter spacing affects all stitch types proportionally:

### Edge Stitches (widthMul: 0.7)
**Before:** 0.9 × (0.2 + 0.7) = 0.81
**After:** 0.75 × (0.05 + 0.7) = 0.56
**Reduction:** 31% tighter

### Single Crochet (widthMul: 1.0)
**Before:** 0.9 × (0.2 + 1.0) = 1.08
**After:** 0.75 × (0.05 + 1.0) = 0.79
**Reduction:** 27% tighter

### Chain Stitches (widthMul: 0.5)
**Before:** 0.9 × (0.2 + 0.5) = 0.63
**After:** 0.75 × (0.05 + 0.5) = 0.41
**Reduction:** 35% tighter

**Note:** Smaller nodes (lower widthMul) get proportionally tighter because the edge gap is a larger fraction of their total width.

## Compatibility

### No Breaking Changes

✅ **Same formula** - Only parameter values changed
✅ **Same logic** - Spacing calculation unchanged
✅ **Same features** - Stitch-type-aware spacing still works
✅ **Same orientation** - Quaternion preservation intact

### Integration

✅ **Layer strategies** - Compatible
✅ **Spacing adjustment** - Compatible
✅ **Open/closed layers** - Compatible
✅ **Mixed stitch types** - Compatible

## Performance

**No performance impact** - Same calculations, just different parameter values.

## Future Enhancements

### User-Configurable Spacing

Consider adding UI controls to let users adjust spacing:

```javascript
// In layerlineStore.js:
settings: {
  nodeSpacingTightness: 0.75,  // User-adjustable packing factor
  nodeGapRatio: 0.05,           // User-adjustable edge gap
  ...
}
```

### Adaptive Spacing

Consider adjusting spacing based on object type:
- Tighter for spheres (more curvature)
- Looser for cylinders (less curvature)
- Adaptive based on local curvature

## Summary

**Problem:** Nodes were too far apart with excessive gaps.

**Solution:** Reduced edge gap ratio from 20% to 5% and packing factor from 90% to 75%.

**Result:** Nodes are now ~27% closer together, creating a tighter, more realistic crochet appearance.

**Impact:** No breaking changes, same functionality, better visual results.

