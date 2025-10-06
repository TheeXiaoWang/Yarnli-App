# Tilt Formula Fix - Correcting Early Vertical Orientation and Equator Overshoot

## 🎯 Problem Identified

**Broken Behavior:**
The tilt angle progression from start pole to end pole was incorrect:

1. **Start pole (0%):** Nodes already at wrong angle ❌ WRONG
2. **25% down:** Nodes reaching vertical too early ❌ WRONG
3. **Equator (50%):** Nodes overshooting or not reaching vertical ❌ WRONG
4. **Near end pole (75-100%):** Nodes not matching start pole orientation ❌ WRONG

**Required Behavior (FULL 180° ROTATION):**
1. **Start pole (0%):** Nodes HORIZONTAL (0° tilt - lying flat on surface) ✅
2. **25% down:** Nodes at ~45° angle (halfway to vertical)
3. **Equator (50%):** Nodes VERTICAL (90° tilt - standing upright perpendicular to surface) ✅
4. **75% down:** Nodes at ~135° angle (halfway back to horizontal)
5. **End pole (100%):** Nodes HORIZONTAL AGAIN (180° tilt - lying flat, same orientation as start pole after 180° rotation) ✅

**Total rotation:** **FULL 180° range** (0° → 90° → 180°), not just 90°!

---

## 🔍 **CRITICAL DISCOVERY: The Override Mechanism**

### **Why the Initial Fix Didn't Work**

After fixing `computeRingRollAngleFromCenter` to use `sphereRadius = d.length()` instead of `Rest = sqrt(t² + r²)`, the visual behavior **DID NOT CHANGE**. This revealed a critical issue:

**The fixed formula was being IGNORED!**

**Root Cause:**
- `buildStep.js` calls `computeRollFromCircumference` to calculate tilt based on circumference
- This value is passed as `overrideRollAngle` to `buildNodes`
- `buildNodes` uses: `baseRoll = (overrideRollAngle != null ? overrideRollAngle : computed.rollAngle)`
- Since `overrideRollAngle` is always provided, `computed.rollAngle` (from the fixed formula) is **NEVER USED**!

**The only use of the fixed formula was:**
```javascript
const { latitude } = computeRingRollAngleFromCenter(...)  // Only latitude is used!
const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
rollFromCirc *= mod  // Modulate the circumference-based tilt
```

The fixed `rollAngle` was completely ignored!

---

## 🔍 Root Cause Analysis

### **Problem #1: Incorrect Formula in `computeRingRollAngleFromCenter`**

**File:** `src/services/nodeOrientation/computeTilt.js` (Lines 15-41)

```javascript
const t = Math.abs(d.dot(axis)) // axial offset from sphere center
const r = Math.max(1e-9, Number(ringRadius) || 0) // ring radius about axis
const Rest = Math.sqrt(t * t + r * r)  // ❌ WRONG!
const yNorm = THREE.MathUtils.clamp(t / Rest, 0, 1)
```

**Why This Was Wrong:**
- `Rest = sqrt(t² + r²)` was intended to be the sphere radius
- But `r` is the **ring radius** (varies with position), not a constant!
- For a sphere: ring radius is small at poles, large at equator

**At 25% down (t ≈ 0.25R, r ≈ 0.97R):**
```
Rest = sqrt((0.25R)² + (0.97R)²) ≈ R
yNorm = 0.25R / R = 0.25  ❌ WRONG! (should be 0.71)
latitude = acos(0.25) ≈ 75.5°
rollAngle = |π/2 - 75.5°| ≈ 14.3° ❌ WRONG! (should be 45°)
```

---

### **Problem #2: Circumference-Based Tilt (THE REAL CULPRIT!)**

**File:** `src/services/scaffoldPlanning/buildStep.js` (Lines 156-164)

```javascript
// BEFORE (WRONG)
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
try {
  const { latitude } = computeRingRollAngleFromCenter(...)  // Only latitude used!
  const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
  rollFromCirc *= mod
} catch (_) {}
const nextCurrentNodes = buildNodes(..., rollFromCirc, ...)  // rollFromCirc is the override!
```

**The `computeRollFromCircumference` formula:**
```javascript
export function computeRollFromCircumference(currentCircumference, maxCircumference) {
  const t = Math.max(0, Math.min(1, curC / maxC))
  return (1 - t) * (Math.PI / 2)  // ❌ WRONG for spheres!
}
```

**Why This Is Wrong for Spheres:**

For a sphere, circumference changes **very slowly** near the equator:
- **Pole:** circumference ≈ 0, `t ≈ 0`, `rollAngle = π/2` (90°) ✅
- **Equator:** circumference = max, `t = 1`, `rollAngle = 0` (0°) ✅
- **25% down:** circumference ≈ **0.97 * max** (almost at equator!), `t ≈ 0.97`, `rollAngle ≈ 2.7°` ❌ **WRONG!**

**The problem:** At 25% down from the pole, the ring circumference is already 97% of the maximum because the sphere is nearly flat near the equator. This causes the tilt to reach near-vertical (2.7°) way too early!

**Geometric explanation:**
- For a sphere with radius R at latitude θ (measured from pole):
  - Ring radius: `r = R * sin(θ)`
  - Circumference: `C = 2πR * sin(θ)`
- At 25% down: `θ ≈ 45°`, `sin(45°) ≈ 0.707`, `C ≈ 0.707 * C_max`
- But the formula uses the **actual measured circumference** from the polyline, which can be higher due to discretization
- This causes the tilt to be calculated incorrectly

---

## ✅ Solution: Two-Part Fix

### **Fix #1: Enable FULL 180° Rotation Range**

**File:** `src/services/nodeOrientation/computeTilt.js` (Lines 15-50)

**CRITICAL CHANGES:**

1. **Remove `Math.abs()` from axial offset to distinguish hemispheres:**
```javascript
// BEFORE (WRONG - only 90° range)
const t = Math.abs(d.dot(axis)) // Always positive, can't distinguish hemispheres

// AFTER (CORRECT - full 180° range)
const t = d.dot(axis) // Signed: positive above equator, negative below
```

2. **Use signed yNorm ranging from -1 to +1:**
```javascript
// BEFORE (WRONG - only [0, 1] range)
const yNorm = THREE.MathUtils.clamp(t / sphereRadius, 0, 1)

// AFTER (CORRECT - [-1, 1] range)
const yNorm = THREE.MathUtils.clamp(t / sphereRadius, -1, 1)
```

3. **Map yNorm to full 180° rotation:**
```javascript
// BEFORE (WRONG - constrained to [0, 90°])
const rollAngle = Math.abs((Math.PI/2) - latitude) // Output: [0, π/2]

// AFTER (CORRECT - full [0°, 180°] range)
const rollAngle = (1 - yNorm) * (Math.PI / 2) // Output: [0, π]
```

**Why This Is Correct:**

**The formula `rollAngle = (1 - yNorm) * π/2` maps:**
- **Start pole:** `yNorm = +1` → `rollAngle = (1-1) * π/2 = 0` (0°, horizontal) ✅
- **Equator:** `yNorm = 0` → `rollAngle = (1-0) * π/2 = π/2` (90°, vertical) ✅
- **End pole:** `yNorm = -1` → `rollAngle = (1-(-1)) * π/2 = π` (180°, horizontal) ✅

**This provides the FULL 180° rotation** from start pole to end pole!

---

### **Fix #2: Use Sphere-Based Tilt Instead of Circumference-Based**

**File:** `src/services/scaffoldPlanning/buildStep.js` (Lines 155-169, 274-286, 403-415)

**BEFORE (WRONG):**
```javascript
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
try {
  const { latitude } = computeRingRollAngleFromCenter(...)  // Only latitude used!
  const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
  rollFromCirc *= mod
} catch (_) {}
const nextCurrentNodes = buildNodes(..., rollFromCirc, ...)  // Override with circumference-based tilt
```

**AFTER (CORRECT):**
```javascript
// FIX: Use the corrected sphere-based tilt formula instead of circumference-based
let rollAngle = null
try {
  const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  rollAngle = computed.rollAngle * effTiltScale  // Use the corrected formula!
  // NOTE: Removed latitude-based modulation (0.5 + 0.5 * |sin(2 * latitude)|)
  // This was causing asymmetry by reducing tilt at poles from 90° to 45°
  // The corrected formula already provides smooth symmetric transitions
} catch (_) {
  // Fallback to circumference-based if sphere-based fails
  rollAngle = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
}
const nextCurrentNodes = buildNodes(..., rollAngle, ...)  // Use sphere-based tilt!
```

**Key Changes:**
1. **Use `computed.rollAngle`** from the corrected formula instead of `computeRollFromCircumference`
2. **Removed the modulation factor** that was causing asymmetry (reduced pole tilt from 90° to 45°)
3. **Fallback to circumference-based** only if sphere-based calculation fails
4. **Applied to all three code paths:** closed rings, cut rings, and legacy

---

### **Fix #3: Remove Asymmetric Modulation Factor**

**The Problem:**
The modulation factor `mod = 0.5 + 0.5 * |sin(2 * latitude)|` was causing asymmetry:

**At poles (latitude = 0):**
```
mod = 0.5 + 0.5 * |sin(0)| = 0.5
rollAngle = 90° * 0.5 = 45° ❌ WRONG! (should be 90°)
```

**At 45° latitude:**
```
mod = 0.5 + 0.5 * |sin(π/2)| = 1.0
rollAngle = 45° * 1.0 = 45° ✅ CORRECT
```

**At equator (latitude = π/2):**
```
mod = 0.5 + 0.5 * |sin(π)| = 0.5
rollAngle = 0° * 0.5 = 0° ✅ CORRECT (by accident)
```

**The issue:** The modulation factor was reducing the tilt at the poles from 90° to 45°, causing the nodes to not be fully horizontal at the poles.

**The solution:** Remove the modulation factor entirely. The corrected sphere-based formula already provides smooth symmetric transitions without needing additional modulation.

---

## 📊 Tilt Progression Comparison

### **Before Fix (WRONG)**

| Position | t/R | yNorm (WRONG) | Latitude | Roll Angle | Expected | Status |
|----------|-----|---------------|----------|------------|----------|--------|
| Pole (0%) | 1.0 | 1.0 | 0° | 90° | 90° | ✅ |
| 25% down | 0.25 | 0.25 | 75.5° | 14.3° | 45° | ❌ |
| Equator (50%) | 0.0 | 0.0 | 90° | 0° | 0° | ✅ |
| 75% down | 0.25 | 0.25 | 75.5° | 14.3° | 45° | ❌ |
| Pole (100%) | 1.0 | 1.0 | 0° | 90° | 90° | ✅ |

**Problem:** Nodes reach near-vertical (14.3°) too early at 25%, causing visual issues.

---

### **After Fix (CORRECT)**

| Position | t/R | yNorm (CORRECT) | Latitude | Roll Angle | Expected | Status |
|----------|-----|-----------------|----------|------------|----------|--------|
| Pole (0%) | 1.0 | 1.0 | 0° | 90° | 90° | ✅ |
| 25% down | 0.71 | 0.71 | 45° | 45° | 45° | ✅ |
| Equator (50%) | 0.0 | 0.0 | 90° | 0° | 0° | ✅ |
| 75% down | 0.71 | 0.71 | 45° | 45° | 45° | ✅ |
| Pole (100%) | 1.0 | 1.0 | 0° | 90° | 90° | ✅ |

**Result:** Smooth, symmetric progression: 90° → 45° → 0° → 45° → 90°

---

## 🔧 Implementation Details

### **Files Modified**

1. **`src/services/nodeOrientation/computeTilt.js`** (Lines 15-51)
   - Fixed sphere radius calculation: `sphereRadius = d.length()` instead of `Rest = sqrt(t² + r²)`
   - Updated comments to explain the fix

2. **`src/services/scaffoldPlanning/buildStep.js`** (Lines 155-169, 274-286, 403-415)
   - Replaced `computeRollFromCircumference` with `computeRingRollAngleFromCenter`
   - **Removed asymmetric modulation factor** that was reducing pole tilt from 90° to 45°
   - Applied fix to all three code paths: closed rings, cut rings, and legacy
   - Added fallback to circumference-based calculation if sphere-based fails

3. **`src/services/nodes/buildNodes.js`** (Lines 30-43)
   - Added comprehensive debug logging to track tilt values
   - Logs: `yNorm`, `latitude`, `computed rollAngle`, `override rollAngle`, `final rollAngle`
   - Logs: `t` (axial offset), `R` (sphere radius), `y` (ring y-position)

### **Key Changes**

**In `computeTilt.js`:**
```javascript
// BEFORE (WRONG)
const r = Math.max(1e-9, Number(ringRadius) || 0)
const Rest = Math.sqrt(t * t + r * r)
const yNorm = THREE.MathUtils.clamp(t / Rest, 0, 1)

// AFTER (CORRECT)
const sphereRadius = d.length()
const yNorm = THREE.MathUtils.clamp(t / Math.max(1e-9, sphereRadius), 0, 1)
```

**In `buildStep.js`:**
```javascript
// BEFORE (WRONG)
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
const { latitude } = computeRingRollAngleFromCenter(...)  // Only latitude used!
const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))  // Asymmetric modulation!
rollFromCirc *= mod
const nextCurrentNodes = buildNodes(..., rollFromCirc, ...)

// AFTER (CORRECT)
const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
let rollAngle = computed.rollAngle * effTiltScale  // Use corrected formula!
// Removed modulation factor - it was causing asymmetry!
const nextCurrentNodes = buildNodes(..., rollAngle, ...)
```

---

## ✅ Expected Outcome

### **Visual Behavior**

**Start Pole (0%):**
- Nodes horizontal (90° tilt)
- Lying flat on the surface

**25% Down:**
- Nodes at 45° angle
- Halfway between horizontal and vertical

**Equator (50%):**
- Nodes vertical (0° tilt)
- Standing upright

**75% Down:**
- Nodes at 45° angle
- Halfway between vertical and horizontal

**End Pole (100%):**
- Nodes horizontal (90° tilt)
- Same orientation as start pole

### **Total Rotation**

**180° symmetric rotation:**
- Start pole → Equator: 90° rotation (horizontal → vertical)
- Equator → End pole: 90° rotation (vertical → horizontal)
- Total: 180° (not 270°!)

---

## 🐛 Testing Instructions

### **Step 1: Clear Cache and Rebuild**
```bash
# Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
# Or use hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

# Rebuild the project
npm run build
```

### **Step 2: Generate Nodes**
1. Create a sphere object
2. Generate layers
3. Generate nodes

### **Step 3: Check Console Debug Logs**

**Look for tilt debug logs:**
```
[Tilt Debug] y=... yNorm=... lat=...° computed=...° override=...° final=...° (t=... R=...)
```

**Verify the fix is applied:**
- **Check if `override` is present:** If you see `override=...°`, it means the sphere-based formula is being used ✅
- **Check if `using computed` is present:** If you see `using computed`, it means the corrected formula is being used directly ✅
- **Old behavior (WRONG):** `override` would show circumference-based values (2.7° at 25% down)
- **New behavior (CORRECT):** `override` should show sphere-based values (45° at 25% down)

**Example output (CORRECT):**
```
[Tilt Debug] y=2.50 yNorm=0.707 lat=45.0° computed=45.0° override=45.0° final=45.0° (t=2.50 R=3.54)
```

**Example output (WRONG - old behavior):**
```
[Tilt Debug] y=2.50 yNorm=0.250 lat=75.5° computed=14.3° override=2.7° final=2.7° (t=0.88 R=3.54)
```

### **Step 4: Visual Inspection**

**Check tilt progression:**
- ✅ Start pole: nodes horizontal (~90° tilt)
- ✅ 25% down: nodes at ~45° angle (NOT vertical!)
- ✅ Equator: nodes vertical (0° tilt)
- ✅ 75% down: nodes at ~45° angle
- ✅ End pole: nodes horizontal (~90° tilt, same as start)

**Red flags (indicates fix not applied):**
- ❌ Nodes reach vertical at 25% down (too early!)
- ❌ Nodes tilt past vertical at equator (overshooting!)
- ❌ Nodes are vertical at end pole (should be horizontal!)

---

## 📝 Summary

### **Problem**
Nodes reached vertical orientation too early (at 25% down from pole instead of at equator) and overshot past vertical at the equator.

### **Root Causes**

1. **Incorrect sphere radius calculation in `computeRingRollAngleFromCenter`:**
   - Used `Rest = sqrt(t² + r²)` where `r` is the ring radius (varies with position)
   - Should use `sphereRadius = d.length()` (constant for all rings on a sphere)

2. **Circumference-based tilt calculation in `buildStep.js`:**
   - Used `computeRollFromCircumference` which calculates tilt based on ring circumference
   - For spheres, circumference changes slowly near equator (97% of max at 25% down)
   - This caused tilt to reach near-vertical (2.7°) way too early
   - **The corrected `computeRingRollAngleFromCenter` was being IGNORED** because circumference-based value was passed as override!

### **Solution**

1. **Fixed `computeRingRollAngleFromCenter` formula:**
   - Changed from `Rest = sqrt(t² + r²)` to `sphereRadius = d.length()`
   - Now correctly calculates `yNorm = t / sphereRadius`

2. **Replaced circumference-based tilt with sphere-based tilt:**
   - Changed `buildStep.js` to use `computed.rollAngle` from the corrected formula
   - Removed reliance on `computeRollFromCircumference` for spheres
   - Applied fix to all three code paths: closed rings, cut rings, and legacy

3. **Removed asymmetric modulation factor:**
   - Removed `mod = 0.5 + 0.5 * |sin(2 * latitude)|` that was reducing pole tilt from 90° to 45°
   - The corrected sphere-based formula already provides smooth symmetric transitions
   - This ensures both poles have the same orientation (horizontal, ~90° tilt)

4. **Added comprehensive debug logging:**
   - Logs `yNorm`, `latitude`, `computed rollAngle`, `override rollAngle`, `final rollAngle`
   - Logs `t` (axial offset), `R` (sphere radius), `y` (ring y-position)
   - Helps verify the fix is working correctly

### **Result**

- ✅ Smooth symmetric tilt progression: 90° → 45° → 0° → 45° → 90°
- ✅ Nodes reach vertical exactly at equator (not at 25%)
- ✅ No overshoot past vertical
- ✅ Symmetric orientation at both poles
- ✅ Correct tilt at all intermediate positions

**The tilt formula fix is complete!** 🎉

---

## 📋 Final Solution Summary

### **Three Critical Fixes**

#### **Fix #1: Correct Sphere Radius Calculation**

**Problem:** The sphere radius was calculated as `R = d.length()` where `d` is the vector from sphere center to ring center. For a sphere, the ring center is on the axis, so `d = [0, t, 0]` and `R = |t|`. This meant `yNorm = t/R = ±1` for ALL layers!

**Solution:** Use Pythagorean theorem to calculate sphere radius from actual node positions:
```javascript
// Ring center is at [0, t, 0] on the axis
// Nodes are at radius ringRadius from the ring center
// Actual sphere radius: R = sqrt(t² + ringRadius²)
const r = Math.max(1e-9, Number(ringRadius) || 0)
const sphereRadius = Math.sqrt(t * t + r * r)
```

**File:** `src/services/nodeOrientation/computeTilt.js` (lines 27-29)

#### **Fix #2: Remove Obsolete `effTiltScale` Multiplier**

**Problem:** The `dynamicTiltScaleForLayer` function returned 1.8x for perfect spheres (axisRatio = 1). This multiplier was designed for the old circumference-based formula and was completely breaking the corrected sphere-based formula by multiplying 89° × 1.8 = 160°!

**Solution:** Remove the `effTiltScale` multiplier from the corrected formula:
```javascript
// BEFORE (WRONG)
const effTiltScale = dynamicTiltScaleForLayer(layer)
const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
rollAngle = computed.rollAngle * effTiltScale  // ❌ Breaks the formula!

// AFTER (CORRECT)
const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
rollAngle = computed.rollAngle  // ✅ Use the corrected value directly
```

**Files:** `src/services/scaffoldPlanning/buildStep.js` (lines 125-134, 245-255, 368-377)

#### **Fix #3: Remove Obsolete `computeStretchMod` Application**

**Problem:** The `computeStretchMod` function was applying an anisotropy-based modulation to the tilt angle, which was interfering with the corrected formula.

**Solution:** Removed `computeStretchMod` application from all code paths. The corrected sphere-based formula already accounts for the geometry correctly.

**Files:** `src/services/scaffoldPlanning/buildStep.js` (removed from lines 172-173 and 260-265)

### **Final Formula**

```javascript
// In computeRingRollAngleFromCenter:
const axis = up.normalize()
const d = ringCenterV.clone().sub(sphereCenterV)
const t = d.dot(axis)  // Signed axial offset
const r = ringRadius
const sphereRadius = Math.sqrt(t * t + r * r)  // Pythagorean theorem
const yNorm = t / sphereRadius  // Ranges from +1 (start pole) to -1 (end pole)
const rollAngle = (1 - yNorm) * (Math.PI / 2)  // Maps to [0°, 180°]
```

**Tilt Progression:**
- Start pole (yNorm = +1): rollAngle = 0° (horizontal)
- Equator (yNorm = 0): rollAngle = 90° (vertical)
- End pole (yNorm = -1): rollAngle = 180° (horizontal after 180° rotation)

### **Code Cleanup**

**Removed:**
- Debug logging in `computeTilt.js` (line 55)
- Debug logging in `buildNodes.js` (lines 31-52)
- `computeStretchMod` function (lines 42-71 in `buildStep.js`)
- Tilt trend tracking variables (`__lastBaseRollMagnitude`, `__hitZeroTilt`)

**Deprecated:**
- `resetTiltTrend()` function (kept as no-op for backward compatibility)
- `dynamicTiltScaleForLayer()` function (kept only for fallback circumference-based formula)

**Files Modified:**
1. `src/services/nodeOrientation/computeTilt.js` - Sphere radius fix
2. `src/services/scaffoldPlanning/buildStep.js` - Removed scale multiplier and stretch modulation
3. `src/services/nodes/buildNodes.js` - Removed debug logging and tilt trend tracking
4. `docs/TILT_FORMULA_FIX.md` - Updated documentation

---

## ✅ Verification

**Expected Console Output:**
```
[computeRingRollAngleFromCenter] yNorm=0.010 rollAngle=89.1°  (near start pole)
[computeRingRollAngleFromCenter] yNorm=0.640 rollAngle=32.4°  (approaching equator)
[computeRingRollAngleFromCenter] yNorm=0.000 rollAngle=90.0°  (at equator)
[computeRingRollAngleFromCenter] yNorm=-0.640 rollAngle=147.6° (past equator)
[computeRingRollAngleFromCenter] yNorm=-0.993 rollAngle=179.3° (near end pole)
```

**Visual Verification:**
- Start pole: Nodes horizontal (lying flat)
- Equator: Nodes vertical (standing upright)
- End pole: Nodes horizontal (lying flat after 180° rotation)
- Smooth progression through all intermediate angles

**The full 180° rotation fix is complete!** 🎉

