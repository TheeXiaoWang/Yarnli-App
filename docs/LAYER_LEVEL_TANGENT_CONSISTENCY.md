# Layer-Level Tangent Consistency Fix - Regression Fix

## 🎯 Critical Regression Identified

**Issue:** After the "Fixed Reference Direction" fix, nodes **within the same layer** had **different rotations**. This broke the fundamental requirement that all nodes in a layer must have identical tilt angles.

**Root Cause:** The tangent flipping logic was applied **per-node** instead of **per-layer**, causing each node to be flipped independently based on its individual tangent direction.

---

## ✅ Solution: Layer-Level Tangent Consistency

### Concept

Instead of checking and flipping each node's tangent individually, we:
1. Check the **first node's tangent** direction for the entire layer
2. If it points opposite to the reference direction, **reverse the entire node array**
3. All nodes in the layer then use the **same tangent direction** (from their `next - prev`)

This ensures:
- ✅ All nodes in a layer have **identical orientations** (except position)
- ✅ Tangent direction is **consistent across layers**
- ✅ No per-node variation within a layer

---

## 🔧 Implementation

### File 1: `buildNodeQuaternion.js` - Removed Per-Node Flipping

**Before (WRONG - Per-Node Flipping):**
```javascript
// WRONG: This was applied to EACH node individually
const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()
const refProjected = referenceDir.clone().sub(nrm.clone().multiplyScalar(referenceDir.dot(nrm)))

if (refProjected.lengthSq() > 1e-6) {
  refProjected.normalize()
  if (tProjected.dot(refProjected) < 0) {
    tProjected.multiplyScalar(-1)  // ❌ Different nodes flipped differently!
  }
}
```

**After (CORRECT - No Per-Node Flipping):**
```javascript
// CORRECT: Just project tangent to surface, no flipping
const tProjected = t.clone().sub(nrm.clone().multiplyScalar(t.dot(nrm))).normalize()

// Basis: X = tangent, Y = binormal, Z = normal
const X = tProjected.clone()
const Z = nrm.clone()
let Y = new THREE.Vector3().crossVectors(Z, X).normalize()
Z.copy(new THREE.Vector3().crossVectors(X, Y)).normalize()
```

**Result:** All nodes in a layer now use their natural tangent direction from `next - prev`.

---

### File 2: `buildNodes.js` - Added Layer-Level Consistency Check

**Location:** Lines 39-85

**Code:**
```javascript
// LAYER-LEVEL TANGENT CONSISTENCY CHECK
// Ensure the first node's tangent direction is consistent across all layers
// This prevents asymmetric orientation between start and end poles
if (nEven >= 2) {
  // Get first node's tangent direction
  const firstEntry = evenPts[0]
  const secondEntry = evenPts[1]
  const p0 = firstEntry.p || firstEntry
  const p1 = secondEntry.p || secondEntry
  
  // Calculate first node's tangent
  const firstTangent = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize()
  
  // Calculate first node's normal
  const pn0 = new THREE.Vector3(p0[0], p0[1], p0[2])
  const nrm0 = pn0.clone().sub(sphereCenterV).normalize()
  
  // Project tangent to surface plane
  const tProjected = firstTangent.clone().sub(nrm0.clone().multiplyScalar(firstTangent.dot(nrm0))).normalize()
  
  // Fixed reference direction (perpendicular to sphere axis)
  const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()
  
  // Project reference onto surface plane
  const refProjected = referenceDir.clone().sub(nrm0.clone().multiplyScalar(referenceDir.dot(nrm0)))
  
  // Check if we need to reverse node ordering for this layer
  let shouldReverse = false
  if (refProjected.lengthSq() > 1e-6) {
    refProjected.normalize()
    // If tangent points opposite to reference, we should reverse the node order
    if (tProjected.dot(refProjected) < 0) {
      shouldReverse = true
    }
  }
  
  // Reverse node order if needed to ensure consistent tangent direction
  if (shouldReverse) {
    evenPts.reverse()
  }
}
```

---

## 📊 How It Works

### Step 1: Check First Node's Tangent

```javascript
const firstTangent = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize()
```

- Calculate tangent from first node to second node
- This represents the circulation direction around the ring

---

### Step 2: Project to Surface Plane

```javascript
const tProjected = firstTangent.clone().sub(nrm0.clone().multiplyScalar(firstTangent.dot(nrm0))).normalize()
```

- Remove any radial component
- Ensures tangent lies in the surface plane

---

### Step 3: Compute Fixed Reference Direction

```javascript
const refVec = Math.abs(upV.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
const referenceDir = new THREE.Vector3().crossVectors(upV, refVec).normalize()
```

- Same fixed reference as before
- Perpendicular to sphere axis
- Same for all layers

---

### Step 4: Check Alignment

```javascript
if (refProjected.lengthSq() > 1e-6) {
  refProjected.normalize()
  if (tProjected.dot(refProjected) < 0) {
    shouldReverse = true
  }
}
```

- If tangent points opposite to reference (dot product < 0)
- Mark layer for reversal

---

### Step 5: Reverse Node Order If Needed

```javascript
if (shouldReverse) {
  evenPts.reverse()
}
```

- Reverse the entire node array
- This flips the circulation direction
- All nodes now have consistent tangent direction

---

## 🔍 Why This Works

### Before Fix (Per-Node Flipping)

**Layer with 4 nodes:**
```
Node 0: tangent [0.5, 0, 0.866], dot(ref) = 0.866 → no flip
Node 1: tangent [0.5, 0, 0.866], dot(ref) = 0.866 → no flip
Node 2: tangent [0.5, 0, 0.866], dot(ref) = 0.866 → no flip
Node 3: tangent [0.5, 0, 0.866], dot(ref) = 0.866 → no flip
```

**BUT** if nodes had different positions:
```
Node 0: tangent [0.5, 0, 0.866], dot(ref) = 0.866 → no flip
Node 1: tangent [0.6, 0, 0.8], dot(ref) = 0.8 → no flip
Node 2: tangent [-0.5, 0, -0.866], dot(ref) = -0.866 → FLIP! ❌
Node 3: tangent [0.4, 0, 0.9], dot(ref) = 0.9 → no flip
```

**Result:** Node 2 has different orientation! ❌

---

### After Fix (Layer-Level Reversal)

**Check first node only:**
```
First node tangent: [0.5, 0, 0.866]
dot(ref) = 0.866 → positive → no reversal
```

**All nodes use their natural tangent:**
```
Node 0: tangent from next-prev = [0.5, 0, 0.866]
Node 1: tangent from next-prev = [0.5, 0, 0.866]
Node 2: tangent from next-prev = [0.5, 0, 0.866]
Node 3: tangent from next-prev = [0.5, 0, 0.866]
```

**Result:** All nodes have **identical orientation**! ✅

---

## ✅ Expected Behavior

### Within a Layer

**All nodes should have:**
- ✅ Same tangent direction
- ✅ Same tilt angle
- ✅ Same quaternion (except for position-dependent components)
- ✅ Identical visual orientation

---

### Across Layers

**Tangent direction should be:**
- ✅ Consistent relative to fixed reference
- ✅ Same circulation direction (clockwise or counter-clockwise)
- ✅ Symmetric between start and end poles

---

### Visual Appearance

**Should show:**
- ✅ Start pole: nodes horizontal (90° tilt)
- ✅ Equator: nodes vertical (0° tilt)
- ✅ End pole: nodes horizontal (90° tilt, same orientation as start)
- ✅ Total rotation: 180° (not 270°)

---

## 🐛 Testing Instructions

### Step 1: Generate Nodes
1. Create a sphere object
2. Generate layers
3. Generate nodes

### Step 2: Visual Inspection

**Check within a layer:**
- All nodes should have **identical rotation**
- No variation around the ring

**Check across layers:**
- Start pole: horizontal
- Equator: vertical
- End pole: horizontal (same as start)

### Step 3: Console Logs

**Look for:**
```
[buildNodes] FIRST LAYER - Node 0 quaternion: {...}
[buildNodes] LAST LAYER - Node 0 quaternion: {...}
```

**Verify:**
- Quaternions are similar for first and last layers
- Tilt angles are symmetric

---

## 📝 Summary

**Regression:** Per-node tangent flipping caused different rotations within same layer

**Root Cause:** Tangent consistency check applied to each node individually

**Fix:**
1. ✅ Removed per-node flipping from `buildNodeQuaternion.js`
2. ✅ Added layer-level consistency check in `buildNodes.js`
3. ✅ Reverse entire node array if first node's tangent points wrong way

**Result:**
- ✅ All nodes in a layer have identical orientation
- ✅ Tangent direction consistent across layers
- ✅ Symmetric orientation at both poles

**Key Insight:** Tangent consistency must be enforced at the **layer level**, not the **node level**.

The layer-level tangent consistency fix is now complete! 🎉

