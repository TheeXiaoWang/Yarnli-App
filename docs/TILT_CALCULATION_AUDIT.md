# Tilt Calculation Audit - Complete Call Chain and Dead Code Analysis

## 🎯 Executive Summary

**PRIMARY TILT CALCULATION IN USE:**
- ✅ **`src/services/nodeOrientation/computeTilt.js`** → `computeRingRollAngleFromCenter()`
- This is the ACTIVE implementation used for all node placement

**DEAD CODE / UNUSED:**
- ❌ **`src/services/nodeOrientation/orientation.js`** → `computeLayerTilt()` and `orientNodesOnLayer()` (LEGACY, NOT USED)
- ⚠️ **`src/domain/layerlines/tilt.js`** → `computeLayerTiltAngle()` (Used only in NodeViewer for visualization, NOT for node placement)
- ⚠️ **`src/utils/nodes/orientation/applyRotisserieSpin.js`** → `computeLatitudeTilt()` (Utility function, NOT used in main pipeline)

---

## 📊 Complete Call Chain - Node Placement

### **Top-Level Entry Point**

```
User clicks "Generate Nodes" button
    ↓
src/ui/editor/LayerlinePanel.jsx
    handleGenerateNodes() (Line 33)
    ↓
    await generateNodesFromLayerlines({ generated, settings })
```

---

### **Node Generation Pipeline**

```
src/app/stores/nodeStore.js
    generateNodesFromLayerlines() (Line 52)
    ↓
    planScaffoldChain() (Line 217)
```

---

### **Scaffold Planning**

```
src/services/scaffoldPlanning/planScaffoldChain.js
    planScaffoldChain() (Line 1)
    ↓
    buildScaffoldStep() (Line 350+)
```

---

### **Step Building**

```
src/services/scaffoldPlanning/buildStep.js
    buildScaffoldStep() (Line 13)
    ↓
    Multiple code paths, all lead to:
    buildNodes() (Lines 151, 164, 279, 397)
```

---

### **Node Building (TILT CALCULATION HAPPENS HERE)**

```
src/services/nodes/buildNodes.js
    buildNodes() (Line 16)
    ↓
    Line 20: const computed = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
    ↓
    Line 21: const baseRoll = (overrideRollAngle != null ? overrideRollAngle : computed.rollAngle)
    ↓
    Line 112: const signedRoll = finalSign * baseRoll
    ↓
    Line 115: const q = buildNodeQuaternion(p, prev, next, sphereCenterV, upV, signedRoll, latitude, yNorm)
```

---

### **Tilt Calculation (PRIMARY IMPLEMENTATION)**

```
src/services/nodeOrientation/computeTilt.js
    computeRingRollAngleFromCenter() (Line 15)
    ↓
    Returns: { rollAngle, latitude, yNorm }
```

**Formula:**
```javascript
const t = Math.abs(d.dot(axis))  // axial offset from sphere center
const r = ringRadius              // ring radius
const Rest = Math.sqrt(t * t + r * r)
const yNorm = t / Rest            // normalized latitude [0,1]
const latitude = Math.acos(yNorm) // latitude: 0 at poles, π/2 at equator
const rollAngle = Math.abs((Math.PI / 2) - latitude)  // 90° at poles, 0° at equator
```

---

### **Quaternion Building**

```
src/services/nodeOrientation/buildNodeQuaternion.js
    buildNodeQuaternion() (Line 4)
    ↓
    Line 33: const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad)
    ↓
    Line 34: const qFinal = qBase.clone().multiply(qRoll)
    ↓
    Returns: qFinal (quaternion with tilt applied)
```

---

## 🔍 All Tilt-Related Functions Found

### **1. ACTIVE - Primary Tilt Calculation**

**File:** `src/services/nodeOrientation/computeTilt.js`

**Functions:**
- ✅ **`computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, ringRadius, up, layerIndex)`**
  - **Status:** ACTIVELY USED
  - **Called from:** `buildNodes.js` (Line 20)
  - **Purpose:** Calculate symmetric tilt angle for a layer
  - **Formula:** `rollAngle = |π/2 - acos(yNorm)|`
  - **Returns:** `{ rollAngle, latitude, yNorm }`

- ✅ **`computeRollFromCircumference(currentCircumference, maxCircumference)`**
  - **Status:** ACTIVELY USED
  - **Called from:** `buildStep.js` (Lines 156, 267, 390)
  - **Purpose:** Calculate tilt from circumference ratio (alternative method)
  - **Formula:** `rollAngle = (1 - ratio) * π/2`
  - **Returns:** `rollAngle` (number)

- ⚠️ **`computeLayerTiltFromCenter(ringCenterV, sphereCenterV, radius, up, layerIndex)`**
  - **Status:** DEPRECATED (back-compat wrapper)
  - **Called from:** None (kept for backward compatibility)
  - **Purpose:** Wrapper around `computeRingRollAngleFromCenter`
  - **Note:** Just calls `computeRingRollAngleFromCenter` internally

---

### **2. DEAD CODE - Legacy Orientation**

**File:** `src/services/nodeOrientation/orientation.js`

**Functions:**
- ❌ **`computeLayerTilt(yNext, centerV, radius, up)`**
  - **Status:** NOT USED (DEAD CODE)
  - **Called from:** Only from `orientNodesOnLayer` in same file (also unused)
  - **Purpose:** Legacy tilt calculation using `asin` instead of `acos`
  - **Formula:** `tilt = |asin(yNorm)|`
  - **Note:** Different formula than active implementation!

- ❌ **`buildNodeQuaternion(p, prev, next, centerV, tiltRad)`**
  - **Status:** NOT USED (DEAD CODE)
  - **Called from:** Only from `orientNodesOnLayer` in same file (also unused)
  - **Purpose:** Legacy quaternion builder (simpler version)
  - **Note:** Missing `up` parameter, uses different orthonormalization

- ❌ **`orientNodesOnLayer(evenPts, centerV, up, yNext, rNext)`**
  - **Status:** NOT USED (DEAD CODE)
  - **Called from:** None
  - **Purpose:** Legacy all-in-one node orientation function
  - **Note:** Replaced by `buildNodes` + `buildNodeQuaternion`

---

### **3. VISUALIZATION ONLY - Not Used for Node Placement**

**File:** `src/domain/layerlines/tilt.js`

**Functions:**
- ⚠️ **`computeLayerTiltAngle(nodeRing, hint)`**
  - **Status:** USED ONLY IN NODEVIEWER (visualization)
  - **Called from:** `NodeViewer.jsx` (Line 11 import)
  - **Purpose:** Calculate tilt for visual display purposes
  - **Formula:** `baseTilt = (1 - ratio) * π/2` with dynamic scaling
  - **Note:** NOT used for actual node placement!

- ⚠️ **`computeRingCircumference(nodeRing)`**
  - **Status:** USED ONLY IN NODEVIEWER (visualization)
  - **Called from:** `computeLayerTiltAngle` in same file
  - **Purpose:** Helper for `computeLayerTiltAngle`

- ⚠️ **`getEquatorCircumference(nodeRing, hint)`**
  - **Status:** USED ONLY IN NODEVIEWER (visualization)
  - **Called from:** `computeLayerTiltAngle` in same file
  - **Purpose:** Helper for `computeLayerTiltAngle`

---

### **4. UTILITY FUNCTIONS - Not Used in Main Pipeline**

**File:** `src/utils/nodes/orientation/applyRotisserieSpin.js`

**Functions:**
- ⚠️ **`computeLatitudeTilt(pos, axis, center, radius, maxTilt)`**
  - **Status:** UTILITY (not used in main pipeline)
  - **Called from:** `applyLatitudeTiltLocalX` in same file
  - **Purpose:** Compute latitude-based tilt for rotisserie effect
  - **Formula:** `tilt = maxTilt * sqrt(1 - yNorm²)`
  - **Note:** Different formula (equator has max tilt, poles have 0)

- ⚠️ **`applyLatitudeTiltLocalX(qBase, pos, axis, center, radius, maxTilt)`**
  - **Status:** UTILITY (not used in main pipeline)
  - **Called from:** None in main pipeline
  - **Purpose:** Apply latitude tilt to existing quaternion
  - **Note:** Inverse tilt behavior (equator tilted, poles flat)

---

### **5. DOMAIN UTILITIES - Used for Orientation Calculation**

**File:** `src/domain/nodes/utils/orientation/sphere.js`

**Functions:**
- ✅ **`calculateSphereOrientation(node, meta)`**
  - **Status:** USED IN NODEVIEWER
  - **Called from:** `NodeViewer.jsx` (Line 10 import)
  - **Purpose:** Calculate orientation for sphere nodes in viewer
  - **Note:** Uses `getQuaternionFromTN` internally

**File:** `src/utils/nodes/orientation/getQuaternionFromTN.js`

**Functions:**
- ✅ **`getQuaternionFromTN(tangentX, radialZ, layerTheta)`**
  - **Status:** USED IN NODEVIEWER
  - **Called from:** `NodeViewer.jsx`, sphere/cone orientation utilities
  - **Purpose:** Build quaternion from tangent and normal
  - **Note:** Similar to `buildNodeQuaternion` but simpler interface

---

## 📝 Override Mechanism

### **`overrideRollAngle` Parameter**

**File:** `src/services/nodes/buildNodes.js` (Line 21)

```javascript
const baseRoll = (overrideRollAngle != null ? overrideRollAngle : computed.rollAngle)
```

**Purpose:**
- Allows caller to override the computed tilt angle
- Used when `computeRollFromCircumference` provides a better estimate

**Usage in `buildStep.js`:**

**Lines 156-164 (Closed ring with polyline):**
```javascript
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
try {
  const { latitude } = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
  rollFromCirc *= mod
} catch (_) {}
const nextCurrentNodes = buildNodes(evenPts, ..., rollFromCirc, ...)  // Override!
```

**Lines 267-279 (Cut ring with arcs):**
```javascript
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
try {
  const { latitude } = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
  rollFromCirc *= mod
} catch (_) {}
const nextCurrentNodes = buildNodes(evenPts, ..., rollFromCirc, ...)  // Override!
```

**Lines 390-397 (Legacy path):**
```javascript
let rollFromCirc = computeRollFromCircumference(thisCirc, maxCircumference) * effTiltScale
try {
  const { latitude } = computeRingRollAngleFromCenter(ringCenterV, sphereCenterV, rNext, upV)
  const mod = 0.5 + 0.5 * Math.abs(Math.sin(2 * latitude))
  rollFromCirc *= mod
} catch (_) {}
const nextCurrentNodes = buildNodes(evenPts, ..., rollFromCirc, ...)  // Override!
```

**Pattern:**
1. Calculate `rollFromCirc` using circumference ratio
2. Get `latitude` from `computeRingRollAngleFromCenter` for modulation
3. Apply latitude-based modulation: `mod = 0.5 + 0.5 * |sin(2 * latitude)|`
4. Pass `rollFromCirc` as `overrideRollAngle` to `buildNodes`

**Result:**
- Most code paths use **circumference-based tilt** with **latitude modulation**
- The `computeRingRollAngleFromCenter` is used for `latitude` calculation, not the final `rollAngle`

---

## ✅ Verification

### **Confirmed Active Call Chain:**

```
LayerlinePanel.jsx (handleGenerateNodes)
    ↓
nodeStore.js (generateNodesFromLayerlines)
    ↓
planScaffoldChain.js (planScaffoldChain)
    ↓
buildStep.js (buildScaffoldStep)
    ↓
buildNodes.js (buildNodes)
    ↓
computeTilt.js (computeRingRollAngleFromCenter)  ← PRIMARY TILT CALCULATION
    ↓
buildNodeQuaternion.js (buildNodeQuaternion)
    ↓
NodeViewer.jsx (renders nodes with quaternions)
```

---

## 🗑️ Recommended Cleanup

### **Files to Remove (Dead Code):**

1. ❌ **`src/services/nodeOrientation/orientation.js`**
   - All functions unused
   - Legacy implementation
   - Can be safely deleted

### **Files to Keep (Active):**

1. ✅ **`src/services/nodeOrientation/computeTilt.js`** - PRIMARY IMPLEMENTATION
2. ✅ **`src/services/nodeOrientation/buildNodeQuaternion.js`** - ACTIVE
3. ✅ **`src/services/nodes/buildNodes.js`** - ACTIVE

### **Files to Keep (Visualization):**

1. ⚠️ **`src/domain/layerlines/tilt.js`** - Used in NodeViewer
2. ⚠️ **`src/utils/nodes/orientation/applyRotisserieSpin.js`** - Utility functions

---

## 📊 Summary

**ACTIVE TILT CALCULATION:**
- ✅ `computeRingRollAngleFromCenter()` in `computeTilt.js`
- ✅ `computeRollFromCircumference()` in `computeTilt.js` (with latitude modulation)

**DEAD CODE:**
- ❌ `orientation.js` - Entire file unused

**VISUALIZATION ONLY:**
- ⚠️ `tilt.js` - Used in NodeViewer, not for node placement

**OVERRIDE MECHANISM:**
- Most code paths use circumference-based tilt with latitude modulation
- `computeRingRollAngleFromCenter` provides `latitude` for modulation, not final `rollAngle`

The tilt calculation audit is complete! 🎉

