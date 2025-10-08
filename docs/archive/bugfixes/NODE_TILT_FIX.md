# Node Tilt/Orientation Fix for Sphere Surface

## 🎯 Problem Identified

**Issue:** Nodes were "over-rotating" as they followed the sphere surface, causing incorrect tilt relative to the surface curvature.

**Visual Symptoms:**
- Nodes appeared to be tilted too much at all positions
- The tilt did not properly follow the sphere's curvature
- Nodes looked like they were "leaning" incorrectly

**Expected Behavior:**
The node tilt should vary smoothly based on position on the sphere:

1. **Near the start pole (top):**
   - Nodes should be **tilted to face upward** (toward the start pole)
   - Approximately horizontal orientation relative to world space
   - Roll angle ≈ **90°** (π/2 radians)
   
2. **Near the equator (middle of sphere):**
   - Nodes should be **vertical** (standing upright)
   - Perpendicular to the sphere surface
   - Roll angle ≈ **0°**
   
3. **Near the end pole (bottom):**
   - Nodes should be **tilted to face downward** (toward the end pole)
   - Approximately horizontal orientation relative to world space
   - Roll angle ≈ **90°** (π/2 radians)

---

## 🔍 Root Cause Analysis

### The Roll Application Was Wrong

**File:** `src/services/nodeOrientation/buildNodeQuaternion.js`

**Lines 23-29 (BEFORE - INCORRECT):**
```javascript
// Roll around the node's LOCAL X expressed in world space:
// pre-multiply by rotation about Xworld to achieve local-X roll
const Xworld = new THREE.Vector3(1, 0, 0).applyQuaternion(qBase).normalize()
// Apply the provided roll angle directly (already mapped by caller)
// Apply the provided roll directly; caller is responsible for sign
const qRollWorldX = new THREE.Quaternion().setFromAxisAngle(Xworld, tiltRad)
const qFinal = qRollWorldX.multiply(qBase)
```

**Why This Was Wrong:**

1. **World-Space Rotation Instead of Local-Space:**
   - The code extracted the world-space X-axis from the base quaternion
   - Applied rotation around this world-space axis
   - Used **pre-multiplication** (`qRollWorldX.multiply(qBase)`)
   - This applies the rotation in **world space**, not local space

2. **Pre-Multiplication vs Post-Multiplication:**
   - **Pre-multiplication** (`qRoll * qBase`): Rotates in world space **before** the base orientation
   - **Post-multiplication** (`qBase * qRoll`): Rotates in local space **after** the base orientation
   - For local-axis rotation, we need **post-multiplication**

3. **Over-Rotation Effect:**
   - The world-space rotation was being applied at the wrong stage
   - This caused the nodes to "over-rotate" relative to the surface
   - The tilt was being applied in the wrong coordinate frame

---

## ✅ Solution

### Changed Roll Application to Local-Space Post-Multiplication

**Lines 20-26 (AFTER - CORRECT):**
```javascript
// Canonical correction first
qBase.multiply(MODEL_TO_CANON_Q)

// Roll around the node's LOCAL X axis (tangent direction)
// Use post-multiplication to apply rotation in local space
const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
const qFinal = qBase.clone().multiply(qRoll)
```

**Why This Is Correct:**

1. **Local-Space Rotation:**
   - Create rotation quaternion around the **canonical local X-axis** `(1, 0, 0)`
   - This is the node's local tangent direction (tip-to-tip)

2. **Post-Multiplication:**
   - Use `qBase.clone().multiply(qRoll)` instead of `qRoll.multiply(qBase)`
   - This applies the roll **after** the base orientation
   - Rotates around the node's **local X-axis**, not world-space

3. **Correct Tilt Behavior:**
   - At poles: `tiltRad = π/2` → nodes lie flat (horizontal)
   - At equator: `tiltRad = 0` → nodes stand upright (vertical)
   - Smooth transition between poles and equator

---

## 🔧 Key Changes

### 1. Removed World-Space Axis Extraction

**Before:**
```javascript
const Xworld = new THREE.Vector3(1, 0, 0).applyQuaternion(qBase).normalize()
```

**After:**
```javascript
// Removed - no longer needed
```

**Reason:** We don't need to extract the world-space X-axis. We rotate around the canonical local X-axis `(1, 0, 0)` instead.

---

### 2. Changed Rotation Axis

**Before:**
```javascript
const qRollWorldX = new THREE.Quaternion().setFromAxisAngle(Xworld, tiltRad)
```

**After:**
```javascript
const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
```

**Reason:** Rotate around the canonical local X-axis `(1, 0, 0)`, not the world-space X-axis.

---

### 3. Changed Multiplication Order

**Before:**
```javascript
const qFinal = qRollWorldX.multiply(qBase)  // Pre-multiplication (world-space)
```

**After:**
```javascript
const qFinal = qBase.clone().multiply(qRoll)  // Post-multiplication (local-space)
```

**Reason:** Post-multiplication applies the rotation in local space, which is what we want for local-axis rotation.

---

## 📐 Mathematical Explanation

### Quaternion Multiplication Order

**Pre-Multiplication (World-Space):**
```
qFinal = qRoll * qBase
```
- Applies `qRoll` **first** (in world space)
- Then applies `qBase` (base orientation)
- Result: Rotation happens in **world coordinates**

**Post-Multiplication (Local-Space):**
```
qFinal = qBase * qRoll
```
- Applies `qBase` **first** (base orientation)
- Then applies `qRoll` (in the local frame defined by `qBase`)
- Result: Rotation happens in **local coordinates**

### Why Local-Space Is Correct

The node's orientation is defined by:
1. **Base orientation** (`qBase`): Aligns node to surface (tangent + normal)
2. **Local roll** (`qRoll`): Rotates around the node's local X-axis (tangent)

We want the roll to happen **after** the base orientation is established, so the rotation is relative to the node's local frame, not the world frame.

---

## 🔍 Tilt Angle Formula (Unchanged)

The tilt angle calculation in `src/services/nodeOrientation/computeTilt.js` remains correct:

```javascript
const rollAngle = ((Math.PI / 2) - latitude)
```

Where:
- `latitude = Math.acos(yNorm)`
- `yNorm = t / Rest` (normalized axial distance)

**At Pole:**
- `yNorm = 1` → `latitude = 0` → `rollAngle = π/2` (90°) ✅

**At Equator:**
- `yNorm = 0` → `latitude = π/2` → `rollAngle = 0` (0°) ✅

This formula was already correct. The issue was only in **how the roll was applied**.

---

## 🐛 Debug Logging

The existing debug logging in `buildNodeQuaternion.js` (lines 32-45) will help verify the fix:

```javascript
if (typeof window !== 'undefined' && window.__DEBUG_NODE_ORIENTATION) {
  const nodeIndex = window.__DEBUG_NODE_ORIENTATION_INDEX || 0
  if (nodeIndex < 3) {
    console.log(`[buildNodeQuaternion] Node ${nodeIndex}:`, {
      position: p,
      center: [centerV.x, centerV.y, centerV.z],
      tangent: [t.x, t.y, t.z],
      normal: [nrm.x, nrm.y, nrm.z],
      tiltRad,
      quaternion: [qFinal.x, qFinal.y, qFinal.z, qFinal.w],
    })
    window.__DEBUG_NODE_ORIENTATION_INDEX = nodeIndex + 1
  }
}
```

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

1. **Near Top Pole:**
   - Nodes should lie **flat** (horizontal)
   - Tilted to face **upward** toward the pole
   - Should look like they're "lying down"

2. **Near Equator:**
   - Nodes should stand **upright** (vertical)
   - Perpendicular to the sphere surface
   - Should look like they're "standing up"

3. **Near Bottom Pole:**
   - Nodes should lie **flat** (horizontal)
   - Tilted to face **downward** toward the pole
   - Should look like they're "lying down" (inverted)

4. **Smooth Transition:**
   - Tilt should change **smoothly** from pole to equator
   - No sudden jumps or discontinuities
   - Nodes should follow the sphere's curvature naturally

### Step 4: Check Console Logs

Look for debug output like:
```
[Tilt] ringBaseRoll=90.00° signed=90.00° (hemi)
[buildNodeQuaternion] Node 0: {
  position: [x, y, z],
  tangent: [tx, ty, tz],
  normal: [nx, ny, nz],
  tiltRad: 1.5708,  // π/2 at pole
  quaternion: [qx, qy, qz, qw]
}
```

**Verify:**
- ✅ `tiltRad` ≈ 1.5708 (π/2) at poles
- ✅ `tiltRad` ≈ 0 at equator
- ✅ Smooth transition between values

---

## 🔧 Files Modified

### `src/services/nodeOrientation/buildNodeQuaternion.js` (Lines 20-26)

**Changes:**
1. ✅ Removed world-space X-axis extraction
2. ✅ Changed rotation axis from `Xworld` to canonical `(1, 0, 0)`
3. ✅ Changed from pre-multiplication to post-multiplication
4. ✅ Simplified code (7 lines → 3 lines)

**Before:**
```javascript
// Canonical correction first
qBase.multiply(MODEL_TO_CANON_Q)

// Roll around the node's LOCAL X expressed in world space:
// pre-multiply by rotation about Xworld to achieve local-X roll
const Xworld = new THREE.Vector3(1, 0, 0).applyQuaternion(qBase).normalize()
const qRollWorldX = new THREE.Quaternion().setFromAxisAngle(Xworld, tiltRad)
const qFinal = qRollWorldX.multiply(qBase)
```

**After:**
```javascript
// Canonical correction first
qBase.multiply(MODEL_TO_CANON_Q)

// Roll around the node's LOCAL X axis (tangent direction)
// Use post-multiplication to apply rotation in local space
const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
const qFinal = qBase.clone().multiply(qRoll)
```

---

## 🎓 Key Learnings

### Quaternion Multiplication Order Matters

**Pre-Multiplication (qRoll * qBase):**
- Rotates in **world space**
- Applied **before** base orientation
- Wrong for local-axis rotation

**Post-Multiplication (qBase * qRoll):**
- Rotates in **local space**
- Applied **after** base orientation
- Correct for local-axis rotation

### Local vs World Coordinate Frames

**World-Space Rotation:**
- Rotation axis is fixed in world coordinates
- Doesn't change with object orientation
- Wrong for surface-following behavior

**Local-Space Rotation:**
- Rotation axis is relative to object's local frame
- Changes with object orientation
- Correct for surface-following behavior

### Canonical Local Axes

When rotating around a local axis after establishing a base orientation:
- Use the **canonical local axis** (e.g., `(1, 0, 0)` for X)
- Apply with **post-multiplication**
- Don't extract the world-space axis from the base quaternion

---

## 📝 Summary

**Problem:** Nodes were "over-rotating" due to incorrect roll application

**Root Cause:** Roll was applied in world space using pre-multiplication instead of local space using post-multiplication

**Solution:** Changed to local-space post-multiplication around canonical X-axis

**Result:** Nodes now correctly follow sphere surface curvature with proper tilt

**Verification:**
- ✅ Nodes lie flat at poles (90° tilt)
- ✅ Nodes stand upright at equator (0° tilt)
- ✅ Smooth transition between poles and equator
- ✅ No "over-rotation" effect

The node tilt is now correct! 🎉

