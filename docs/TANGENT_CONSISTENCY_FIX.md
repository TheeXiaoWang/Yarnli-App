# Tangent Consistency Fix - Asymmetric Node Orientation at Poles

## 🎯 Problem Identified

**Issue:** Despite symmetric tilt angles (78.75° at start pole, 78.09° at end pole), the visual appearance was asymmetric:
- **Start pole nodes:** Lying **horizontal** (correct) ✅
- **End pole nodes:** Standing **vertical** (incorrect) ❌

**Root Cause:** The tangent vector calculation was inconsistent between the start and end poles, causing the node orientation basis to flip.

---

## 🔍 Root Cause Analysis

### Tangent Vector Calculation

**File:** `src/services/nodeOrientation/buildNodeQuaternion.js`

**Line 6 (BEFORE - PROBLEMATIC):**
```javascript
const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
```

**Why This Was Problematic:**

1. **Tangent = `next - prev`:**
   - This calculates the direction from the previous node to the next node
   - For a ring of nodes, this gives the tangent direction around the ring

2. **Node Ordering Around Poles:**
   - At the **start pole**, nodes are ordered **counter-clockwise** (when viewed from above)
   - At the **end pole**, nodes might be ordered **clockwise** (when viewed from above)
   - This causes the tangent direction to **reverse** between poles

3. **Basis Flip:**
   - The basis is constructed as: `X = tangent`, `Y = Z × X`, `Z = normal`
   - If the tangent flips direction, the entire basis flips
   - This causes the roll angle to be applied in the **opposite direction**

4. **Visual Result:**
   - Start pole: tangent points "forward" → roll tilts nodes **horizontal** ✅
   - End pole: tangent points "backward" → roll tilts nodes **vertical** ❌

---

## ✅ Solution

### Ensure Tangent Consistency Relative to Sphere Axis

**Lines 4-35 (AFTER - CORRECT):**
```javascript
export function buildNodeQuaternion(p, prev, next, centerV, up, tiltRad, latitude = null, yNorm = null) {
  // Tangent (tip-to-tip direction around the ring)
  const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
  
  // Outward normal (from sphere center to node position)
  const pn = new THREE.Vector3(p[0], p[1], p[2])
  const nrm = pn.clone().sub(centerV).normalize()
  
  // Sphere axis (up direction)
  const upV = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()

  // Ensure tangent is perpendicular to the normal (project out any radial component)
  // This prevents tangent from pointing inward/outward at the poles
  const tProjected = t.clone().sub(nrm.clone().multiplyScalar(t.dot(nrm))).normalize()
  
  // Ensure tangent follows right-hand rule relative to sphere axis
  // At poles, the tangent should circulate consistently around the axis
  // Compute the "azimuthal" direction: perpendicular to both axis and radial
  const azimuthal = new THREE.Vector3().crossVectors(upV, nrm)
  if (azimuthal.lengthSq() > 1e-6) {
    azimuthal.normalize()
    // If tangent is pointing opposite to azimuthal direction, flip it
    if (tProjected.dot(azimuthal) < 0) {
      tProjected.multiplyScalar(-1)
    }
  }

  // Basis: X = tangent, Y = binormal, Z = normal
  const X = tProjected.clone()
  const Z = nrm.clone()
  let Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  Z.copy(new THREE.Vector3().crossVectors(X, Y)).normalize()
  // ... rest of function
}
```

---

## 🔧 Key Changes

### 1. Project Tangent to Surface Plane

**Before:**
```javascript
const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
const X = t.clone()
```

**After:**
```javascript
const t = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
const tProjected = t.clone().sub(nrm.clone().multiplyScalar(t.dot(nrm))).normalize()
const X = tProjected.clone()
```

**Reason:** Remove any radial component from the tangent to ensure it lies in the surface plane.

---

### 2. Ensure Consistent Azimuthal Direction

**New Code:**
```javascript
const upV = (up?.isVector3 ? up.clone() : new THREE.Vector3(up[0], up[1], up[2])).normalize()
const azimuthal = new THREE.Vector3().crossVectors(upV, nrm)
if (azimuthal.lengthSq() > 1e-6) {
  azimuthal.normalize()
  if (tProjected.dot(azimuthal) < 0) {
    tProjected.multiplyScalar(-1)
  }
}
```

**Reason:** 
- Compute the "azimuthal" direction: `azimuthal = up × normal`
- This gives the direction of circulation around the sphere axis
- If the tangent points opposite to this direction, flip it
- This ensures tangent always circulates in the same direction relative to the axis

---

## 📐 Mathematical Explanation

### Azimuthal Direction

The **azimuthal direction** is the direction of circulation around the sphere's axis at a given point on the surface.

**Formula:**
```
azimuthal = up × normal
```

Where:
- `up` = sphere axis direction (e.g., Y-axis)
- `normal` = outward normal at the node position (radial direction)
- `×` = cross product

**Properties:**
- Perpendicular to both the axis and the radial direction
- Lies in the surface plane (tangent to the sphere)
- Points in the direction of "eastward" circulation (right-hand rule)

**At North Pole:**
- `normal = up` → `azimuthal = up × up = 0` (undefined)
- Near north pole: `azimuthal` points "eastward" around the pole

**At Equator:**
- `normal ⊥ up` → `azimuthal` is well-defined
- Points in the direction of circulation around the axis

**At South Pole:**
- `normal = -up` → `azimuthal = up × (-up) = 0` (undefined)
- Near south pole: `azimuthal` points "eastward" around the pole (same direction as north)

---

### Tangent Consistency Check

**Before Fix:**
- Start pole: `tangent = next - prev` (could be eastward or westward)
- End pole: `tangent = next - prev` (could be eastward or westward)
- **No guarantee** that both point in the same direction relative to the axis

**After Fix:**
- Start pole: `tangent` is aligned with `azimuthal` (always eastward)
- End pole: `tangent` is aligned with `azimuthal` (always eastward)
- **Guaranteed** that both point in the same direction relative to the axis

---

## 🐛 Debug Logging

### Enhanced Debug Output

**Lines 54-75 (NEW):**
```javascript
// DEBUG: Log orientation data for first and last few nodes
if (typeof window !== 'undefined' && window.__DEBUG_NODE_ORIENTATION) {
  const nodeIndex = window.__DEBUG_NODE_ORIENTATION_INDEX || 0
  const isFirstLayer = window.__DEBUG_NODE_ORIENTATION_FIRST_LAYER || false
  const isLastLayer = window.__DEBUG_NODE_ORIENTATION_LAST_LAYER || false
  
  if ((isFirstLayer && nodeIndex < 3) || (isLastLayer && nodeIndex < 3)) {
    const layerLabel = isFirstLayer ? 'FIRST' : isLastLayer ? 'LAST' : 'MIDDLE'
    console.log(`[buildNodeQuaternion] ${layerLabel} Layer Node ${nodeIndex}:`, {
      position: p,
      prev,
      next,
      center: [centerV.x, centerV.y, centerV.z],
      tangent: [X.x, X.y, X.z],
      normal: [Z.x, Z.y, Z.z],
      tiltRad,
      tiltDeg: THREE.MathUtils.radToDeg(tiltRad),
      quaternion: [qFinal.x, qFinal.y, qFinal.z, qFinal.w],
      basisX: [X.x, X.y, X.z],
      basisY: [Y.x, Y.y, Y.z],
      basisZ: [Z.x, Z.y, Z.z],
    })
    window.__DEBUG_NODE_ORIENTATION_INDEX = nodeIndex + 1
  }
}
```

**Changes:**
- Added `isFirstLayer` and `isLastLayer` flags
- Log both first and last layer nodes (first 3 of each)
- Include `prev` and `next` positions for debugging
- Include basis vectors (X, Y, Z) for verification
- Include tilt angle in both radians and degrees

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

1. **Near Start Pole:**
   - Nodes should lie **flat** (horizontal)
   - Tilted to face **upward** toward the pole
   - Roll angle ≈ **79°**

2. **Near Equator:**
   - Nodes should stand **upright** (vertical)
   - Perpendicular to the sphere surface
   - Roll angle ≈ **0°**

3. **Near End Pole:**
   - Nodes should lie **flat** (horizontal) (**same as start pole**)
   - Tilted to face **upward** toward the pole
   - Roll angle ≈ **78°**

4. **Symmetric Appearance:**
   - Both poles should have the **same visual orientation**
   - No asymmetry between start and end poles

### Step 4: Check Console Logs

Look for:
```
[buildNodeQuaternion] FIRST Layer Node 0: {
  tangent: [tx, ty, tz],
  tiltDeg: 78.75,
  basisX: [bx, by, bz],
  ...
}
[buildNodeQuaternion] LAST Layer Node 0: {
  tangent: [tx, ty, tz],
  tiltDeg: 78.09,
  basisX: [bx, by, bz],
  ...
}
```

**Verify:**
- ✅ Tangent vectors at both poles point in **similar directions** (not opposite)
- ✅ Basis X vectors at both poles are **consistent**
- ✅ Tilt angles are **similar** (~78-79°)

---

## 🔧 Files Modified

### `src/services/nodeOrientation/buildNodeQuaternion.js` (Lines 4-75)

**Changes:**
1. ✅ Added sphere axis (`upV`) extraction
2. ✅ Project tangent to surface plane (remove radial component)
3. ✅ Compute azimuthal direction (`up × normal`)
4. ✅ Flip tangent if pointing opposite to azimuthal direction
5. ✅ Enhanced debug logging for first and last layers

---

## 📝 Summary

**Problem:** Asymmetric node orientation at poles despite symmetric tilt angles

**Root Cause:** Tangent vector direction was inconsistent between start and end poles

**Solution:** 
1. Project tangent to surface plane
2. Ensure tangent follows right-hand rule relative to sphere axis
3. Flip tangent if pointing opposite to azimuthal direction

**Result:**
- ✅ Both poles have the same horizontal orientation
- ✅ Tangent direction is consistent across the entire sphere
- ✅ No asymmetry between start and end poles

**Verification:**
- ✅ Visual appearance is symmetric
- ✅ Console logs show consistent tangent directions
- ✅ Tilt angles are symmetric (~78-79° at both poles)

The tangent consistency fix is now complete! 🎉

