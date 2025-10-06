# Comprehensive Tilt Logging - Debug Tool for Node Orientation

## 🎯 Purpose

This logging feature provides a comprehensive view of tilt angles across all layers of a sphere object, making it easy to:
- Verify symmetric tilt behavior around the equator
- Identify unexpected jumps or discontinuities in tilt progression
- Debug asymmetric orientation issues
- Confirm tilt calculation formulas are producing correct values

---

## 📊 Output Format

### Console Table

When you generate nodes for a sphere object, you'll see a table in the browser console:

```
[Node Tilt Summary] Tilt angles for all layers:

┌─────────┬────────────┬─────┬──────────────┬──────────────┬────────────────┬────────────────┬───────────┬────────────┐
│ (index) │ layerIndex │  y  │ baseRollRad  │ baseRollDeg  │ signedRollRad  │ signedRollDeg  │ nodeCount │ stitchType │
├─────────┼────────────┼─────┼──────────────┼──────────────┼────────────────┼────────────────┼───────────┼────────────┤
│    0    │     0      │ 10.5│   1.375      │    78.75     │    1.375       │     78.75      │     6     │    'sc'    │
│    1    │     1      │ 9.8 │   1.240      │    71.02     │    1.240       │     71.02      │    12     │    'sc'    │
│    2    │     2      │ 9.1 │   1.192      │    68.30     │    1.192       │     68.30      │    18     │    'sc'    │
│   ...   │    ...     │ ... │     ...      │     ...      │      ...       │      ...       │    ...    │    ...     │
│   24    │    24      │-9.8 │   1.240      │    71.02     │    1.240       │     71.02      │    12     │    'sc'    │
│   25    │    25      │-10.5│   1.375      │    78.75     │    1.375       │     78.75      │     6     │    'sc'    │
└─────────┴────────────┴─────┴──────────────┴──────────────┴────────────────┴────────────────┴───────────┴────────────┘
```

### Key Observations Summary

After the table, you'll see a summary with key observations:

```javascript
[Node Tilt Summary] Key observations: {
  totalLayers: 26,
  firstLayer: {
    index: 0,
    y: 10.5,
    tiltDeg: 78.75,
    nodeCount: 6
  },
  middleLayer: {
    index: 13,
    y: 0.0,
    tiltDeg: 0.66,
    nodeCount: 36
  },
  lastLayer: {
    index: 25,
    y: -10.5,
    tiltDeg: 78.09,
    nodeCount: 6
  },
  symmetryCheck: {
    firstVsLast: "78.75° vs 78.09° (diff: 0.66°)",
    expectedSymmetric: true
  }
}
```

---

## 📋 Column Descriptions

### `layerIndex`
- **Type:** Integer (0-based)
- **Description:** Sequential index of the layer in the ordered layer list
- **Range:** 0 to (totalLayers - 1)

### `y`
- **Type:** Float (3 decimal places)
- **Description:** Y-coordinate (height) of the layer along the sphere's axis
- **Units:** Same as object scale
- **Example:** For a sphere with radius 10, y ranges from ~10 (top pole) to ~-10 (bottom pole)

### `baseRollRad`
- **Type:** Float (6 decimal places)
- **Description:** Base roll angle in radians (before applying any sign adjustments)
- **Range:** 0 to π/2 (0 to ~1.571)
- **Formula:** `rollAngle = abs((π/2) - latitude)`

### `baseRollDeg`
- **Type:** Float (2 decimal places)
- **Description:** Base roll angle in degrees (before applying any sign adjustments)
- **Range:** 0° to 90°
- **Interpretation:**
  - **~90°** = Near poles (nodes lying flat/horizontal)
  - **~0°** = Near equator (nodes standing upright/vertical)

### `signedRollRad`
- **Type:** Float (6 decimal places)
- **Description:** Signed roll angle in radians (after applying finalSign)
- **Current Behavior:** Same as `baseRollRad` (finalSign = 1 for symmetric tilt)
- **Historical Note:** Previously could be negative in the southern hemisphere

### `signedRollDeg`
- **Type:** Float (2 decimal places)
- **Description:** Signed roll angle in degrees (after applying finalSign)
- **Current Behavior:** Same as `baseRollDeg` (finalSign = 1 for symmetric tilt)

### `nodeCount`
- **Type:** Integer
- **Description:** Number of nodes (stitches) in this layer
- **Typical Pattern:** Increases from poles to equator, then decreases

### `stitchType`
- **Type:** String
- **Description:** Stitch type used for this layer
- **Common Values:** `'sc'` (single crochet), `'hdc'`, `'dc'`, `'ch'` (chain)

---

## 🔍 How to Use This Data

### 1. Verify Symmetric Tilt

**Expected Pattern:**
- Tilt should **decrease** from start pole to equator
- Tilt should **increase** from equator to end pole
- Start and end pole tilt values should be **similar** (within ~1-2°)

**Example (Correct):**
```
Layer 0:  y=10.5,  tilt=78.75°  (start pole)
Layer 13: y=0.0,   tilt=0.66°   (equator)
Layer 25: y=-10.5, tilt=78.09°  (end pole)
```

**Symmetry Check:**
- First vs Last: `78.75° vs 78.09°` → Difference: `0.66°` ✅
- Expected: Difference < 5° ✅

---

### 2. Identify Discontinuities

**Look for:**
- Sudden jumps in tilt angle between consecutive layers
- Non-monotonic progression (tilt increasing when it should decrease, or vice versa)

**Example (Problematic):**
```
Layer 10: tilt=45.0°
Layer 11: tilt=20.0°  ← Sudden jump of 25°! ❌
Layer 12: tilt=15.0°
```

**Expected (Smooth):**
```
Layer 10: tilt=45.0°
Layer 11: tilt=40.0°  ← Gradual decrease ✅
Layer 12: tilt=35.0°
```

---

### 3. Verify Tilt Formula

**Formula:**
```javascript
latitude = acos(yNorm)
rollAngle = abs((π/2) - latitude)
```

Where:
- `yNorm = t / sqrt(t² + r²)`
- `t` = axial offset from sphere center
- `r` = ring radius

**At Poles:**
- `yNorm ≈ 1` → `latitude ≈ 0` → `rollAngle ≈ π/2` (90°)

**At Equator:**
- `yNorm ≈ 0` → `latitude ≈ π/2` → `rollAngle ≈ 0` (0°)

**Verification:**
- Check that layers near y=±R (poles) have tilt ≈ 90°
- Check that layers near y=0 (equator) have tilt ≈ 0°

---

### 4. Debug Asymmetric Orientation

**If visual orientation is asymmetric despite symmetric tilt angles:**

1. **Check Console Table:**
   - Verify tilt angles are actually symmetric
   - Look for any unexpected patterns

2. **Check Tangent Consistency:**
   - Enable detailed node orientation logging (see `buildNodeQuaternion.js`)
   - Compare tangent vectors at start vs end poles
   - Tangent should point in consistent direction relative to sphere axis

3. **Check Quaternion Application:**
   - Verify quaternions are being applied correctly in `NodeViewer.jsx`
   - Check for any quaternion inversion or conjugation

---

## 🔧 Implementation Details

### Location

**File:** `src/services/scaffoldPlanning/planScaffoldChain.js`

**Lines:**
- **181:** Initialize `tiltDataByLayer` array
- **391-410:** Collect tilt data for each layer
- **427-469:** Log comprehensive tilt table and summary

---

### Data Collection

**During Layer Processing (Lines 391-410):**
```javascript
// Collect tilt data for comprehensive logging
const firstNode = adjusted[0]
if (firstNode && typeof firstNode.theta === 'number') {
  const thetaRad = firstNode.theta
  const thetaDeg = THREE.MathUtils.radToDeg(thetaRad)
  
  tiltDataByLayer.push({
    layerIndex: ringIndex,
    y: Number(yNext.toFixed(3)),
    baseRollRad: Number(thetaRad.toFixed(6)),
    baseRollDeg: Number(thetaDeg.toFixed(2)),
    signedRollRad: Number(thetaRad.toFixed(6)),
    signedRollDeg: Number(thetaDeg.toFixed(2)),
    nodeCount: adjusted.length,
    stitchType: firstNode.stitchType || 'sc',
  })
}
```

**Key Points:**
- Extracts `theta` (signed roll angle) from first node in each layer
- All nodes in a ring have the same tilt, so first node is representative
- Rounds values for readability (3 decimals for y, 2 for degrees, 6 for radians)

---

### Logging Output

**After All Layers Processed (Lines 427-469):**
```javascript
// Comprehensive tilt data logging for all layers
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && tiltDataByLayer.length > 0) {
  try {
    console.log('\n[Node Tilt Summary] Tilt angles for all layers:')
    console.table(tiltDataByLayer)
    
    // Additional analysis: check for symmetry
    const firstLayer = tiltDataByLayer[0]
    const lastLayer = tiltDataByLayer[tiltDataByLayer.length - 1]
    const middleIndex = Math.floor(tiltDataByLayer.length / 2)
    const middleLayer = tiltDataByLayer[middleIndex]
    
    console.log('[Node Tilt Summary] Key observations:', {
      totalLayers: tiltDataByLayer.length,
      firstLayer: { index, y, tiltDeg, nodeCount },
      middleLayer: { index, y, tiltDeg, nodeCount },
      lastLayer: { index, y, tiltDeg, nodeCount },
      symmetryCheck: {
        firstVsLast: `${first}° vs ${last}° (diff: ${diff}°)`,
        expectedSymmetric: diff < 5,
      },
    })
  } catch (err) {
    console.error('[Node Tilt Summary] Error logging tilt data:', err)
  }
}
```

**Features:**
- Only logs in development mode (`import.meta.env.DEV`)
- Uses `console.table()` for readable tabular output
- Includes symmetry analysis comparing first and last layers
- Identifies middle layer (near equator)
- Calculates tilt difference between poles

---

## ✅ Testing Instructions

### Step 1: Generate Sphere Layers
1. Create a sphere object
2. Open Layerlines panel
3. Click **"Generate Layers"**

### Step 2: Generate Nodes
1. Click **"Generate Nodes"**
2. Open browser console (F12)

### Step 3: View Tilt Data

**Look for:**
```
[Node Tilt Summary] Tilt angles for all layers:
```

**Followed by:**
- Console table with all layer tilt data
- Key observations summary

### Step 4: Verify Symmetric Behavior

**Check:**
1. ✅ Tilt decreases from start pole to equator
2. ✅ Tilt increases from equator to end pole
3. ✅ First and last layer tilt values are similar (diff < 5°)
4. ✅ Middle layer (equator) has tilt ≈ 0°
5. ✅ No sudden jumps or discontinuities

---

## 📝 Summary

**Feature:** Comprehensive tilt logging for all layers

**Purpose:** Debug and verify symmetric tilt behavior

**Output:**
- Console table with tilt data for every layer
- Key observations summary with symmetry check

**Usage:**
- Generate nodes for sphere object
- Check browser console for tilt table
- Verify symmetric progression and identify anomalies

**Benefits:**
- Easy visual inspection of tilt values
- Quick symmetry verification
- Identifies discontinuities or unexpected patterns
- Helps debug orientation issues

The comprehensive tilt logging is now complete! 🎉

