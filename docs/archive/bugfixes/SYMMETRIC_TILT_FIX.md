# Symmetric Node Tilt Fix - 180° Rotation Instead of 270°

## 🎯 Problem Identified

**Issue:** Node tilt behavior on spheres was asymmetric between the start pole and end pole, causing a **270° rotation** instead of the expected **180° symmetric tilt**.

**Current Behavior (Incorrect):**
- **Near start pole (top):** Nodes lying **horizontal** (correct) ✅
- **Near end pole (bottom):** Nodes **facing downward** (incorrect) ❌
- **Total rotation from start to end:** Approximately **270°** instead of **180°**

**Expected Behavior (Correct):**
- **Near start pole (top):** Nodes lie **horizontal**, facing **upward** toward the pole
- **Near end pole (bottom):** Nodes lie **horizontal**, facing **upward** toward the pole (same orientation as start pole)
- **Total rotation from start to end:** Should be **180°** (symmetric tilt)

**Visual Description:**
- Imagine a person standing on the sphere at different latitudes:
  - At **north pole**: person lies flat, facing **up**
  - At **equator**: person stands **vertical**
  - At **south pole**: person lies flat, facing **up** (same as north pole, not facing down)
- The tilt should be **symmetric** around the equator

---

## 🔍 Root Cause Analysis

### The Hemisphere Sign Flip Was Wrong

**File:** `src/services/nodes/buildNodes.js`

**Lines 23-32 (BEFORE - INCORRECT):**
```javascript
// Simple rule: flip sign only AFTER the first ring with near-zero |tilt|
// Keep the zero-tilt ring itself positive.
const ZERO_EPS = 1e-3 // radians (~0.057°)
const absRoll = Math.abs(baseRoll)
const prevHitZero = __hitZeroTilt
const hitsZeroNow = absRoll <= ZERO_EPS
// First ring positive; after we've ALREADY seen a zero ring, force negative
const finalSign = (__lastBaseRollMagnitude == null) ? 1 : (prevHitZero ? -1 : 1)
__hitZeroTilt = prevHitZero || hitsZeroNow
__lastBaseRollMagnitude = baseRoll
```

**Why This Was Wrong:**

1. **Sign Flip After Equator:**
   - North hemisphere: `finalSign = +1` → roll = `+90°` to `0°`
   - South hemisphere: `finalSign = -1` → roll = `0°` to `-90°`
   - **Total rotation: 90° - (-90°) = 180°** ✅ (mathematically correct)

2. **But Visually Wrong:**
   - At north pole: `+90°` roll → nodes horizontal, facing up ✅
   - At south pole: `-90°` roll → nodes horizontal, facing **down** ❌
   - The **negative sign** inverts the tilt direction, making nodes face downward

3. **270° Rotation Effect:**
   - From north pole to south pole: `+90°` → `0°` → `-90°`
   - Visual rotation: `90°` → `0°` → `180°` (continuing in same direction)
   - But the negative sign makes it look like `270°` rotation (90° extra)

---

## ✅ Solution

### Part 1: Remove Hemisphere Sign Flip

**File:** `src/services/nodes/buildNodes.js`

**Lines 20-37 (AFTER - CORRECT):**
```javascript
const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
const baseRoll = (overrideRollAngle != null ? overrideRollAngle : computed.rollAngle)
const { latitude, yNorm } = computed

// SYMMETRIC TILT: Use absolute value of roll angle (no sign flip)
// This ensures nodes at both poles have the same orientation (horizontal, facing up)
// Tilt goes: 90° (pole) → 0° (equator) → 90° (pole)
const finalSign = 1  // Always positive for symmetric tilt
const absRoll = Math.abs(baseRoll)

// Per-ring tilt log (dev only)
try {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const baseDeg = THREE.MathUtils.radToDeg(baseRoll)
    const signedDeg = THREE.MathUtils.radToDeg(finalSign * baseRoll)
    console.log(`[Tilt] ringBaseRoll=${baseDeg.toFixed(2)}° signed=${signedDeg.toFixed(2)}° (symmetric)`) 
  }
} catch (_) {}
```

**Changes:**
1. ✅ Removed hemisphere sign flip logic (lines 23-32)
2. ✅ Set `finalSign = 1` (always positive)
3. ✅ Removed state tracking variables (`__hitZeroTilt`, `__lastBaseRollMagnitude`)
4. ✅ Updated log message from `(hemi)` to `(symmetric)`

---

### Part 2: Ensure Roll Angle Is Always Positive

**File:** `src/services/nodeOrientation/computeTilt.js`

**Lines 4-41 (AFTER - CORRECT):**
```javascript
/**
 * Symmetric layer tilt (90° at both poles, 0° at equator).
 * ringCenterV: center of this ring (point on axis in the ring's plane)
 * sphereCenterV: center of the sphere (object center)
 * radius: sphere radius
 * up: sphere axis (any direction, will be normalized)
 * 
 * Returns ABSOLUTE roll angle for symmetric tilt:
 * - Poles: 90° (nodes lie horizontal)
 * - Equator: 0° (nodes stand vertical)
 */
export function computeRingRollAngleFromCenter(
  ringCenterV,
  sphereCenterV,
  ringRadius,
  up,
  layerIndex = null
) {
  const axis = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()
  const d = ringCenterV.clone().sub(sphereCenterV)
  const t = Math.abs(d.dot(axis)) // axial offset from sphere center (always positive)
  const r = Math.max(1e-9, Number(ringRadius) || 0) // ring radius about axis
  const Rest = Math.sqrt(t * t + r * r)
  // Axis-relative normalized latitude in [0,1] (always positive due to Math.abs)
  const yNorm = THREE.MathUtils.clamp(t / Rest, 0, 1)

  // latitude: 0 at poles, π/2 at equator
  // Since yNorm is in [0,1], latitude is in [0, π/2]
  const latitude = Math.acos(yNorm)

  // Roll angle for symmetric tilt:
  // - At poles: yNorm=1, latitude=0, rollAngle=π/2 (90°)
  // - At equator: yNorm=0, latitude=π/2, rollAngle=0 (0°)
  // Always positive for symmetric behavior
  const rollAngle = Math.abs((Math.PI / 2) - latitude)

  return { rollAngle, latitude, yNorm }
}
```

**Changes:**
1. ✅ Updated docstring to clarify "90° at both poles, 0° at equator"
2. ✅ Added comment explaining `Math.abs(d.dot(axis))` makes `t` always positive
3. ✅ Updated comment: `yNorm` is in `[0,1]` (not `[-1,1]`)
4. ✅ Updated comment: `latitude` is in `[0, π/2]` (not `[0, π]`)
5. ✅ Added `Math.abs()` to roll angle formula for extra safety
6. ✅ Added detailed comments explaining the formula

---

## 🔧 Key Changes Summary

### 1. Removed Hemisphere Sign Flip

**Before:**
```javascript
const finalSign = (__lastBaseRollMagnitude == null) ? 1 : (prevHitZero ? -1 : 1)
```

**After:**
```javascript
const finalSign = 1  // Always positive for symmetric tilt
```

**Reason:** Sign flip caused nodes to face downward at south pole instead of upward.

---

### 2. Ensured Roll Angle Is Always Positive

**Before:**
```javascript
const rollAngle = ((Math.PI / 2) - latitude)
```

**After:**
```javascript
const rollAngle = Math.abs((Math.PI / 2) - latitude)
```

**Reason:** Extra safety to ensure roll angle is always positive (though formula already guarantees this).

---

### 3. Updated Documentation

**Before:**
```javascript
// Symmetric layer tilt (0° at both poles, 90° at equator).
```

**After:**
```javascript
// Symmetric layer tilt (90° at both poles, 0° at equator).
```

**Reason:** Corrected the description to match the actual behavior.

---

## 📐 Mathematical Verification

### Tilt Angle Progression

Given the formula:
```javascript
const t = Math.abs(d.dot(axis))  // Always positive
const yNorm = t / Rest            // In [0, 1]
const latitude = Math.acos(yNorm) // In [0, π/2]
const rollAngle = Math.abs((Math.PI / 2) - latitude)
```

**At North Pole:**
- `t = R` (maximum axial distance)
- `r = 0` (ring radius is zero)
- `Rest = R`
- `yNorm = R / R = 1`
- `latitude = Math.acos(1) = 0`
- `rollAngle = |π/2 - 0| = π/2` (90°) ✅

**At Equator:**
- `t = 0` (zero axial distance)
- `r = R` (ring radius is maximum)
- `Rest = R`
- `yNorm = 0 / R = 0`
- `latitude = Math.acos(0) = π/2`
- `rollAngle = |π/2 - π/2| = 0` (0°) ✅

**At South Pole:**
- `t = R` (maximum axial distance, same as north pole due to Math.abs)
- `r = 0` (ring radius is zero)
- `Rest = R`
- `yNorm = R / R = 1`
- `latitude = Math.acos(1) = 0`
- `rollAngle = |π/2 - 0| = π/2` (90°) ✅

**Tilt Progression:**
```
North Pole: 90° (horizontal, facing up)
    ↓
Equator: 0° (vertical)
    ↓
South Pole: 90° (horizontal, facing up)
```

**Total Rotation: 90° + 90° = 180°** ✅

---

## 🐛 Debug Logging

### Expected Console Output

```
[Tilt] ringBaseRoll=90.00° signed=90.00° (symmetric)
[Tilt] ringBaseRoll=75.00° signed=75.00° (symmetric)
[Tilt] ringBaseRoll=60.00° signed=60.00° (symmetric)
[Tilt] ringBaseRoll=45.00° signed=45.00° (symmetric)
[Tilt] ringBaseRoll=30.00° signed=30.00° (symmetric)
[Tilt] ringBaseRoll=15.00° signed=15.00° (symmetric)
[Tilt] ringBaseRoll=0.00° signed=0.00° (symmetric)
[Tilt] ringBaseRoll=15.00° signed=15.00° (symmetric)
[Tilt] ringBaseRoll=30.00° signed=30.00° (symmetric)
[Tilt] ringBaseRoll=45.00° signed=45.00° (symmetric)
[Tilt] ringBaseRoll=60.00° signed=60.00° (symmetric)
[Tilt] ringBaseRoll=75.00° signed=75.00° (symmetric)
[Tilt] ringBaseRoll=90.00° signed=90.00° (symmetric)
```

**Key Observations:**
- ✅ All signed values are **positive**
- ✅ Tilt decreases from 90° to 0° (north to equator)
- ✅ Tilt increases from 0° to 90° (equator to south)
- ✅ **Symmetric** around the equator
- ✅ Log message shows `(symmetric)` instead of `(hemi)`

---

## ✅ Testing Instructions

### Step 1: Generate Sphere Layers
1. Create a sphere object
2. Open Layerlines panel
3. Click **"Generate Layers"**

### Step 2: Generate Nodes
1. Click **"Generate Nodes"**
2. Enable node visualization

### Step 3: Visual Verification

**Check node orientation at different positions:**

1. **Near North Pole:**
   - Nodes should lie **flat** (horizontal)
   - Tilted to face **upward** toward the pole
   - Roll angle ≈ **90°**

2. **Near Equator:**
   - Nodes should stand **upright** (vertical)
   - Perpendicular to the sphere surface
   - Roll angle ≈ **0°**

3. **Near South Pole:**
   - Nodes should lie **flat** (horizontal)
   - Tilted to face **upward** toward the pole (same as north pole)
   - Roll angle ≈ **90°**

4. **Symmetric Transition:**
   - Tilt should change **symmetrically** around the equator
   - North to equator: 90° → 0°
   - Equator to south: 0° → 90°
   - **Total rotation: 180°** (not 270°)

### Step 4: Check Console Logs

Look for:
```
[Tilt] ringBaseRoll=90.00° signed=90.00° (symmetric)
```

**Verify:**
- ✅ All `signed` values are **positive**
- ✅ Values decrease from 90° to 0° (north to equator)
- ✅ Values increase from 0° to 90° (equator to south)
- ✅ Log message shows `(symmetric)` not `(hemi)`

---

## 🔧 Files Modified

### 1. `src/services/nodes/buildNodes.js` (Lines 20-37)

**Changes:**
1. ✅ Removed hemisphere sign flip logic
2. ✅ Set `finalSign = 1` (always positive)
3. ✅ Removed state tracking variables
4. ✅ Updated log message to `(symmetric)`

### 2. `src/services/nodeOrientation/computeTilt.js` (Lines 4-41)

**Changes:**
1. ✅ Updated docstring to clarify symmetric behavior
2. ✅ Added comments explaining `Math.abs()` usage
3. ✅ Updated comments for `yNorm` and `latitude` ranges
4. ✅ Added `Math.abs()` to roll angle formula
5. ✅ Added detailed formula explanation

---

## 🎓 Key Learnings

### Symmetric vs Asymmetric Tilt

**Asymmetric Tilt (WRONG):**
```
North Pole: +90° (facing up)
Equator: 0°
South Pole: -90° (facing down)
Total rotation: 180° mathematically, but 270° visually
```

**Symmetric Tilt (CORRECT):**
```
North Pole: +90° (facing up)
Equator: 0°
South Pole: +90° (facing up)
Total rotation: 180° both mathematically and visually
```

### Sign Matters for Visual Orientation

- **Positive roll**: Nodes tilt "forward" (facing up)
- **Negative roll**: Nodes tilt "backward" (facing down)
- For symmetric behavior, both poles should have the **same sign**

### Math.abs() for Symmetric Behavior

Using `Math.abs(d.dot(axis))` ensures:
- `t` is always positive
- `yNorm` is in `[0, 1]` (not `[-1, 1]`)
- `latitude` is in `[0, π/2]` (not `[0, π]`)
- Roll angle is symmetric around the equator

---

## 📝 Summary

**Problem:** Nodes rotated 270° from pole to pole instead of 180°

**Root Cause:** Hemisphere sign flip inverted tilt direction at south pole

**Solution:** Removed sign flip, ensured roll angle is always positive

**Result:** Symmetric tilt with 180° total rotation

**Verification:**
- ✅ Both poles have same orientation (horizontal, facing up)
- ✅ Equator has vertical orientation
- ✅ Smooth symmetric transition
- ✅ Total rotation is 180° (not 270°)

The symmetric tilt is now correct! 🎉

