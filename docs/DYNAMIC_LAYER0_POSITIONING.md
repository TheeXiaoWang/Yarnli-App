# Dynamic Layer 0 Positioning Based on Magic Ring Stitch Count

## 🎯 Problem Solved

**Issue:** Layer 0 (magic ring) was generated at a fixed position, producing a fixed circumference that naturally fit ~9 nodes. The `magicRingDefaultStitches` setting (e.g., 4) was ignored during layerline generation, causing a mismatch between the desired stitch count and the actual layer circumference.

**Solution:** Layer 0's position is now **dynamically adjusted** during layerline generation to produce a circumference that fits exactly the desired number of edge stitches.

---

## 🔧 How It Works

### Before (Incorrect)

1. Layer 0 generated at fixed position (distance 1 from start pole)
2. Layer 0 circumference calculated from fixed position
3. Circumference naturally fits 9 nodes based on edge stitch width
4. Magic ring setting (4 nodes) ignored during layerline generation
5. Node generation tries to force 4 nodes onto a circumference sized for 9 nodes
6. **Result:** Mismatch between setting and visual

### After (Correct)

1. Read `magicRingDefaultStitches` setting (e.g., 4)
2. Calculate required circumference: `circumference = stitchCount × edgeStitchWidth × packingFactor`
3. **Adjust Layer 0's position** so its circumference matches the required value
4. Generate Layer 0 at this adjusted position (may be closer or farther from start pole)
5. Node generation places exactly 4 nodes on this correctly-sized circumference
6. **Result:** Setting matches visual

---

## 📐 Formula

### Desired Circumference Calculation

**File:** `src/domain/layerlines/firstGap.js` (Lines 5-27)

```javascript
export function desiredFirstCircumference(settings) {
  const gauge = computeStitchDimensions({ 
    sizeLevel: settings?.yarnSizeLevel ?? 4, 
    baseWidth: 1, 
    baseHeight: 1 
  })
  const edge = STITCH_TYPES.edge || STITCH_TYPES.sc
  const widthMul = edge.widthMul ?? 0.7  // Edge stitch is 0.7x of SC
  const PACKING = 0.9  // Tightening factor
  const spacing = gauge.width × widthMul × PACKING
  
  // Use magicRingDefaultStitches setting if available, otherwise default to 5
  const stitchCount = Number.isFinite(settings?.magicRingDefaultStitches) 
    ? Math.max(3, Math.round(settings.magicRingDefaultStitches))
    : 5
  
  return stitchCount × spacing
}
```

### Example Calculation

**Given:**
- `magicRingDefaultStitches = 4`
- `yarnSizeLevel = 4` → `gauge.width = 0.5`
- `edge.widthMul = 0.7`
- `PACKING = 0.9`

**Calculation:**
```
spacing = 0.5 × 0.7 × 0.9 = 0.315
circumference = 4 × 0.315 = 1.26
radius = 1.26 / (2π) = 0.20
```

**Result:** Layer 0 is positioned at radius 0.20 from the start pole

---

## 🔍 Shape-Specific Implementation

### Cone, Cylinder, Pyramid, Capsule, Torus

These shapes already had first-gap logic, now updated to use the dynamic stitch count:

**Pattern:**
```javascript
const desiredCirc = desiredFirstCircumference(settings)
const perimeterAt = shapePerimeterAtDistanceFactory({ matrix, dir })
const solvedGap = solveFirstGap({ 
  targetCircumference: desiredCirc, 
  upperBound: heightWorld, 
  perimeterAt 
})
```

**Binary Search:**
- `solveFirstGap` uses binary search to find the distance from the pole where the perimeter equals the desired circumference
- This distance becomes the position of Layer 0

### Sphere (New Implementation)

Spheres use arc-length-based spacing, so the implementation is different:

**File:** `src/domain/shapes/sphere/layers.js` (Lines 187-240)

```javascript
// Calculate desired first layer circumference
const desiredCirc = desiredFirstCircumference(settings)

// Solve for the theta angle that produces the desired circumference
// For a sphere, circumference at angle theta from pole = 2π × r × sin(theta)
const targetRadius = desiredCirc / (2 × Math.PI)
const targetSinTheta = Math.min(1, targetRadius / aEqu)
const firstTheta = Math.asin(targetSinTheta)

// Calculate the arc length to this first layer
const firstArc = integrateArcLength(firstTheta, metric, nBase)

// Start layer generation from this arc length
let k = Math.max(1, Math.round(firstArc / step))
let prevTheta = firstTheta

// Add the first layer at the calculated position
const cosT = Math.cos(firstTheta)
const rings = sliceSphereLocal(matrix, poleLocal, cosT)
layers.push({ y: tSort, polylines: rings, meta: { isFirstLayer: true } })
```

**Key Difference:**
- Spheres use **geodesic arc length** instead of linear distance
- First layer angle (theta) is calculated from desired circumference
- Arc length integration ensures proper spacing

**Layer Spacing Fix:**
After adding the first layer at the adjusted position, subsequent layers must continue from that position:

```javascript
let currentArc = firstArc  // Start at adjusted position

// Add first layer
layers.push({ ... })

// Continue from firstArc + step
currentArc += step
while (currentArc < totalArc - tol && localIdx < maxLayers) {
  const target = currentArc  // ✅ Use actual arc length, not k * step
  // ... generate layer ...
  currentArc += step  // ✅ Increment for next layer
  localIdx++
}
```

**Why This Matters:**
- **Before:** Loop used `k * step` where `k = round(firstArc / step)`, causing gaps
- **After:** Loop uses `currentArc` which increments from `firstArc`, ensuring consistent spacing
- **Result:** All layers have spacing = `step` (e.g., 0.5000)

---

## 🐛 Debug Logging

### firstGap.js

```javascript
console.log('[FirstGap] Calculating desired circumference:', {
  'magicRingDefaultStitches': settings?.magicRingDefaultStitches,
  'stitchCount': stitchCount,
  'spacing': spacing.toFixed(4),
  'circumference': (stitchCount * spacing).toFixed(4),
})
```

### sphere/layers.js

```javascript
console.log('[Sphere] First layer adjustment:', {
  'desiredCirc': desiredCirc.toFixed(4),
  'targetRadius': targetRadius.toFixed(4),
  'aEqu (equatorial radius)': aEqu.toFixed(4),
  'firstTheta (radians)': firstTheta.toFixed(4),
  'firstTheta (degrees)': (firstTheta * 180 / Math.PI).toFixed(2),
  'firstArc': firstArc.toFixed(4),
  'step': step.toFixed(4),
})
```

---

## 📊 Expected Console Output

### When Generating Layers

```
[FirstGap] Calculating desired circumference: {
  magicRingDefaultStitches: 4,
  stitchCount: 4,
  spacing: "0.3150",
  circumference: "1.2600"
}

[Sphere] First layer adjustment: {
  desiredCirc: "1.2600",
  targetRadius: "0.2006",
  aEqu (equatorial radius): "1.0000",
  firstTheta (radians): "0.2014",
  firstTheta (degrees): "11.54",
  firstArc: "0.2014",
  step: "0.5000"
}
```

**Interpretation:**
- Desired circumference: 1.26 units
- Target radius: 0.20 units (from start pole)
- First layer angle: 11.54° from pole
- Arc length to first layer: 0.20 units

---

## 🔧 Files Modified

### 1. `src/domain/layerlines/firstGap.js` (Lines 5-27)
- **Changed:** `desiredFirstCircumference` now uses `magicRingDefaultStitches` setting
- **Before:** Hardcoded to 5 stitches
- **After:** Dynamic based on user setting (defaults to 5 if not set)
- **Added:** Debug logging

### 2. `src/domain/shapes/sphere/layers.js` (Lines 1-5, 187-288)
- **Added:** Import `desiredFirstCircumference` and `STITCH_TYPES`
- **Added:** First layer position calculation based on desired circumference
- **Added:** Arc length integration to find correct theta angle
- **Fixed:** Layer spacing - changed from `k * step` to `currentArc` tracking
- **Added:** Debug logging for Layer 0 and subsequent layers
- **Changed:** Layer generation uses `currentArc` variable for consistent spacing

---

## ✅ Testing Instructions

### Step 1: Set Magic Ring Stitches
1. Open Layerlines panel
2. Set "Magic Ring Stitches" to **4**
3. Click "Generate Layers"

### Step 2: Check Console Output
```
[FirstGap] Calculating desired circumference: {
  magicRingDefaultStitches: 4,
  stitchCount: 4,
  ...
}

[Sphere] First layer adjustment: {
  desiredCirc: "1.2600",
  firstTheta (degrees): "11.54",
  ...
}
```

### Step 3: Generate Nodes
1. Click "Generate Nodes"
2. Set layer slider to **0** (magic ring)
3. Count the yellow nodes - should be exactly **4**

### Step 4: Verify Circumference
1. Check console for magic ring node generation:
```
[MR-Nodes] Stitch count override logic: {
  S0 (final value): 4,
  ringCircumference: "1.2600",  ← Should match desiredCirc
  ...
}
```

---

## 🎓 Key Concepts

### Edge Stitch Type

**File:** `src/constants/stitchTypes.js` (Lines 43-48)

```javascript
edge: {
  name: "edge layer",
  widthMul: 0.7,   // 0.7x of single crochet width
  heightMul: 1,    // 1x of single crochet height
  depthMul: 0.6,   // 0.6x of single crochet depth
  color: 0xffff00, // Yellow
}
```

**Purpose:**
- Used for first and last layers
- Smaller than standard stitches for tighter fit
- Yellow color for easy visual identification

### Packing Factor

**Value:** 0.9 (90% of calculated spacing)

**Purpose:**
- Creates slight overlap between stitches
- Produces more realistic, compact appearance
- Prevents gaps between nodes

### Binary Search (solveFirstGap)

**Algorithm:**
1. Start with range [0, upperBound]
2. Test midpoint: calculate perimeter at distance d
3. If perimeter < target: search upper half
4. If perimeter ≥ target: search lower half
5. Repeat 40 iterations for precision
6. Return the distance where perimeter ≥ target

**Precision:** ~10 decimal places after 40 iterations

---

## 📝 Summary

**Problem:** Layer 0 circumference was fixed, ignoring magic ring stitch count setting

**Solution:** Dynamically adjust Layer 0 position during layerline generation

**Implementation:**
1. Calculate desired circumference from stitch count
2. Use binary search (or arc length integration for spheres) to find correct position
3. Generate Layer 0 at this position
4. Node generation places exact number of nodes on correctly-sized circumference

**Result:** Setting matches visual - 4 stitches produces exactly 4 nodes

**Files Modified:**
- `src/domain/layerlines/firstGap.js` - Dynamic stitch count
- `src/domain/shapes/sphere/layers.js` - Sphere-specific first layer adjustment

**Shapes Supported:**
- ✅ Sphere (new implementation)
- ✅ Cone (updated to use dynamic count)
- ✅ Cylinder (updated to use dynamic count)
- ✅ Pyramid (updated to use dynamic count)
- ✅ Capsule (updated to use dynamic count)
- ✅ Torus (updated to use dynamic count)

---

## 🚀 Next Steps

1. **Test with different stitch counts** (3, 4, 5, 6, 8, 10, 12)
2. **Verify all shape types** (sphere, cone, cylinder, etc.)
3. **Check different yarn sizes** (1-9)
4. **Verify layer spacing** remains correct after first layer adjustment
5. **Test with different object scales** (small, medium, large)

The dynamic positioning ensures that the magic ring always has the correct number of stitches, regardless of yarn size or object scale! 🧶

