# Tilt Formula Fix - Cleanup Summary

## Overview

This document summarizes the cleanup performed after fixing the node tilt calculation for spheres.

## Changes Made

### 1. Removed Obsolete Code from `buildStep.js`

**File:** `src/services/scaffoldPlanning/buildStep.js`

#### Removed `computeStretchMod` Function (Lines 42-71)
- **Reason:** This function was applying anisotropy-based modulation that interfered with the corrected sphere-based formula
- **Impact:** The corrected formula already accounts for geometry correctly, so this modulation was unnecessary

#### Simplified `dynamicTiltScaleForLayer` Function (Lines 30-41)
- **Before:** Used for all tilt calculations
- **After:** Only used for fallback circumference-based formula
- **Added comment:** "Dynamic tilt scale for fallback circumference-based formula only"

#### Cleaned Up Tilt Calculation Comments (3 locations)
- **Closed rings path** (lines 125-134)
- **Cut rings path** (lines 245-255)
- **Legacy path** (lines 368-377)

**Before:**
```javascript
// FIX: Use the corrected sphere-based tilt formula instead of circumference-based
// The circumference-based formula gives incorrect results for spheres because
// circumference changes slowly near the equator (97% of max at 25% down from pole)
// NOTE: The corrected formula already accounts for sphere geometry, so we do NOT
// apply the dynamicTiltScaleForLayer multiplier (which was designed for the old formula)
let rollAngle = null
try {
  const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  rollAngle = computed.rollAngle
  // NOTE: Removed latitude-based modulation (0.5 + 0.5 * |sin(2 * latitude)|)
  // This was causing asymmetry by reducing tilt at poles from 90° to 45°
  // The corrected formula already provides smooth symmetric transitions
} catch (_) {
  // Fallback to circumference-based if sphere-based fails (apply scale for old formula)
  const effTiltScale = dynamicTiltScaleForLayer(layer)
  rollAngle = computeRollFromCircumference(thisCirc, Math.max(thisCirc, Number(maxCircumference) || thisCirc)) * effTiltScale
}
```

**After:**
```javascript
// Use the corrected sphere-based tilt formula
let rollAngle = null
try {
  const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  rollAngle = computed.rollAngle
} catch (_) {
  // Fallback to circumference-based if sphere-based fails
  const effTiltScale = dynamicTiltScaleForLayer(layer)
  rollAngle = computeRollFromCircumference(thisCirc, Math.max(thisCirc, Number(maxCircumference) || thisCirc)) * effTiltScale
}
```

### 2. Removed Debug Logging from `computeTilt.js`

**File:** `src/services/nodeOrientation/computeTilt.js`

**Removed (Lines 52-56):**
```javascript
// DEBUG: Log the calculation with full details
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.log(`[computeRingRollAngleFromCenter] ringCenter=[${ringCenterV.x.toFixed(2)}, ${ringCenterV.y.toFixed(2)}, ${ringCenterV.z.toFixed(2)}] sphereCenter=[${sphereCenterV.x.toFixed(2)}, ${sphereCenterV.y.toFixed(2)}, ${sphereCenterV.z.toFixed(2)}] d=[${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${d.z.toFixed(2)}] axis=[${axis.x.toFixed(2)}, ${axis.y.toFixed(2)}, ${axis.z.toFixed(2)}] t=${t.toFixed(2)} r=${r.toFixed(2)} R=${sphereRadius.toFixed(2)} yNorm=${yNorm.toFixed(3)} rollAngle=${THREE.MathUtils.radToDeg(rollAngle).toFixed(1)}°`)
}
```

### 3. Removed Debug Logging and Tilt Trend Tracking from `buildNodes.js`

**File:** `src/services/nodes/buildNodes.js`

#### Removed Tilt Trend Tracking Variables (Lines 7-8)
```javascript
// REMOVED:
let __lastBaseRollMagnitude = null
let __hitZeroTilt = false
```

#### Deprecated `resetTiltTrend()` Function (Lines 8-10)
**Before:**
```javascript
export function resetTiltTrend() {
  __lastBaseRollMagnitude = null
  __hitZeroTilt = false
}
```

**After:**
```javascript
// Deprecated: resetTiltTrend() was removed as tilt trend tracking is no longer needed
// The corrected sphere-based formula provides consistent tilt values without state tracking
export function resetTiltTrend() {
  // No-op: kept for backward compatibility
}
```

**Reason:** The function is still called in `planScaffoldChain.js` and `planScaffoldChainV2.js`, so it's kept as a no-op for backward compatibility.

#### Removed Debug Logging (Lines 31-52)
**Removed:**
```javascript
// Per-ring tilt log with comprehensive debug info
try {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const baseDeg = THREE.MathUtils.radToDeg(baseRoll)
    const signedDeg = THREE.MathUtils.radToDeg(signedRoll)
    const computedDeg = THREE.MathUtils.radToDeg(computed.rollAngle)
    const isOverride = overrideRollAngle != null
    const d = ringCenterV.clone().sub(sphereCenterV)
    const sphereRadius = d.length()
    const t = d.dot((up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize())

    console.log(`[Tilt Debug] y=${ringCenter[1].toFixed(2)} yNorm=${computed.yNorm.toFixed(3)} lat=${THREE.MathUtils.radToDeg(computed.latitude).toFixed(1)}° computed=${computedDeg.toFixed(1)}° ${isOverride ? `override=${baseDeg.toFixed(1)}°` : 'using computed'} final=${signedDeg.toFixed(1)}° (t=${t.toFixed(2)} R=${sphereRadius.toFixed(2)})`)

    // CRITICAL DEBUG: Check if rollAngle is being clamped somewhere
    if (Math.abs(computedDeg) > 90.1) {
      console.warn(`[Tilt Debug] ⚠️ Roll angle > 90°! This should produce full 180° rotation range!`)
    }
    if (Math.abs(computedDeg - 180) < 1 && Math.abs(signedDeg) < 1) {
      console.error(`[Tilt Debug] ❌ BUG FOUND: computed=180° but final=0°! The 180° range is being destroyed!`)
    }
  }
} catch (_) {}
```

#### Simplified Comments (Lines 24-25)
**Before:**
```javascript
// FULL 180° ROTATION: Use the roll angle directly without modification
// This enables full rotation from start pole (0°) → equator (90°) → end pole (180°)
// Start pole: horizontal (0°, lying flat)
// Equator: vertical (90°, standing upright)
// End pole: horizontal (180°, lying flat after 180° rotation)
const signedRoll = baseRoll  // Use roll angle directly for full 180° range
```

**After:**
```javascript
// Use the roll angle directly for full 180° rotation range
const signedRoll = baseRoll
```

### 4. Updated Documentation

**File:** `docs/TILT_FORMULA_FIX.md`

Added comprehensive "Final Solution Summary" section (lines 453-555) documenting:
- The three critical fixes (sphere radius, effTiltScale removal, computeStretchMod removal)
- Final formula with code examples
- Code cleanup summary
- Verification instructions

## Files Modified

1. `src/services/scaffoldPlanning/buildStep.js` - Removed obsolete functions and simplified comments
2. `src/services/nodeOrientation/computeTilt.js` - Removed debug logging
3. `src/services/nodes/buildNodes.js` - Removed debug logging and tilt trend tracking
4. `docs/TILT_FORMULA_FIX.md` - Added final solution summary

## Remaining Deprecated Code

### Kept for Backward Compatibility

1. **`resetTiltTrend()` function** in `buildNodes.js`
   - Now a no-op
   - Still called in `planScaffoldChain.js` and `planScaffoldChainV2.js`
   - Can be removed in future refactoring

2. **`dynamicTiltScaleForLayer()` function** in `buildStep.js`
   - Only used for fallback circumference-based formula
   - Can be removed if circumference-based fallback is removed

3. **`hemisphereSign` parameter** in `buildNodes()`
   - Unused but kept to avoid breaking call sites
   - Can be removed in future refactoring

## Build Status

✅ Build successful with no errors or warnings (except chunk size warning)

## Next Steps

1. Test the application to verify the full 180° rotation works correctly
2. Consider removing deprecated code in a future refactoring:
   - Remove `resetTiltTrend()` calls and function
   - Remove `hemisphereSign` parameter
   - Consider removing circumference-based fallback if no longer needed

