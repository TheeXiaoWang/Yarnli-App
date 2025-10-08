# Quaternion Pipeline Debugging - Comprehensive Logging System

## 🎯 Purpose

This debugging system tracks node quaternions through the entire pipeline from creation to rendering, helping identify where asymmetric orientation issues are introduced.

---

## 📊 Logging Stages

The system logs quaternions at **4 key stages**:

1. **Stage 1: `buildNodes.js`** - Quaternion creation
2. **Stage 2: `buildNodeQuaternion.js`** - Tangent consistency check
3. **Stage 3: `planScaffoldChain.js`** - After all layers processed
4. **Stage 4: `NodeViewer.jsx`** - Quaternion application to mesh

---

## 🔍 Stage 1: Quaternion Creation (`buildNodes.js`)

### What It Logs

**First Layer (Layer 0):**
```javascript
[buildNodes] FIRST LAYER - Node 0 quaternion: {
  layerIndex: 0,
  y: -0.024,
  position: [x, y, z],
  quaternion: [qx, qy, qz, qw],
  theta: 1.442,
  thetaDeg: 82.63
}
```

**Last Layer (Layer N):**
```javascript
[buildNodes] LAST LAYER - Node 0 quaternion: {
  layerIndex: 24,
  y: 8.034,
  position: [x, y, z],
  quaternion: [qx, qy, qz, qw],
  theta: 1.371,
  thetaDeg: 78.57
}
```

### Key Information

- **`layerIndex`**: Sequential layer index (0-based)
- **`y`**: Y-coordinate (height) of the layer
- **`position`**: 3D position of node 0
- **`quaternion`**: Final quaternion `[x, y, z, w]` after roll application
- **`theta`**: Signed roll angle in radians
- **`thetaDeg`**: Signed roll angle in degrees

### What to Check

✅ **Quaternions should be similar** for first and last layers (if tilt angles are similar)
❌ **If quaternions differ significantly**, the issue is in quaternion creation

---

## 🔍 Stage 2: Tangent Consistency Check (`buildNodeQuaternion.js`)

### What It Logs

**First Layer:**
```javascript
[buildNodeQuaternion] FIRST LAYER - Tangent consistency check: {
  layerIndex: 0,
  rawTangent: [tx, ty, tz],
  projectedTangent: [px, py, pz],
  azimuthal: [ax, ay, az],
  tangentDotAzimuthal: 0.95,
  wasFlipped: false,
  finalTangent: [fx, fy, fz],
  normal: [nx, ny, nz],
  tiltRad: 1.442,
  tiltDeg: 82.63
}
```

**Last Layer:**
```javascript
[buildNodeQuaternion] LAST LAYER - Tangent consistency check: {
  layerIndex: 24,
  rawTangent: [tx, ty, tz],
  projectedTangent: [px, py, pz],
  azimuthal: [ax, ay, az],
  tangentDotAzimuthal: -0.85,
  wasFlipped: true,
  finalTangent: [fx, fy, fz],
  normal: [nx, ny, nz],
  tiltRad: 1.371,
  tiltDeg: 78.57
}
```

### Key Information

- **`rawTangent`**: Original tangent from `next - prev`
- **`projectedTangent`**: Tangent after projecting to surface plane
- **`azimuthal`**: Azimuthal direction (`up × normal`)
- **`tangentDotAzimuthal`**: Dot product (positive = same direction, negative = opposite)
- **`wasFlipped`**: Whether tangent was flipped to match azimuthal direction
- **`finalTangent`**: Final tangent used for basis construction
- **`normal`**: Outward normal (radial direction)

### What to Check

✅ **`finalTangent` should point in consistent direction** relative to azimuthal
✅ **`wasFlipped` may differ** between layers (this is expected and correct)
❌ **If `finalTangent` points in opposite directions** at first vs last layer, this indicates a tangent consistency issue

---

## 🔍 Stage 3: After All Layers Processed (`planScaffoldChain.js`)

### What It Logs

**Summary after all layers:**
```javascript
[Node Tilt Summary] Tilt angles for all layers:
(console.table with all layer data)

[Node Tilt Summary] Key observations: {
  totalLayers: 25,
  firstLayer: { index: 0, y: -0.024, tiltDeg: 82.63, nodeCount: 7 },
  middleLayer: { index: 12, y: 4.069, tiltDeg: 0, nodeCount: 57 },
  lastLayer: { index: 24, y: 8.034, tiltDeg: 78.57, nodeCount: 4 },
  symmetryCheck: {
    firstVsLast: '82.63° vs 78.57° (diff: 4.06°)',
    expectedSymmetric: true
  }
}
```

### What to Check

✅ **Tilt angles should be symmetric** (first ≈ last)
✅ **Middle layer should have tilt ≈ 0°**
❌ **If tilt angles are asymmetric**, the issue is in tilt calculation

---

## 🔍 Stage 4: Quaternion Application to Mesh (`NodeViewer.jsx`)

### What It Logs

**First Layer:**
```javascript
[NodeViewer] Received nodes: {
  totalNodes: 7,
  nodesWithQuaternion: 7,
  layerY: -0.024,
  firstNodeQuaternion: [qx, qy, qz, qw],
  firstNodeTheta: 1.442,
  firstNodeThetaDeg: 82.63,
  ...
}

[NodeViewer] FIRST LAYER - Applied quaternion to mesh: {
  layerY: -0.024,
  quaternion: [qx, qy, qz, qw],
  theta: 1.442,
  thetaDeg: 82.63,
  position: [x, y, z]
}
```

**Last Layer:**
```javascript
[NodeViewer] Received nodes: {
  totalNodes: 4,
  nodesWithQuaternion: 4,
  layerY: 8.034,
  firstNodeQuaternion: [qx, qy, qz, qw],
  firstNodeTheta: 1.371,
  firstNodeThetaDeg: 78.57,
  ...
}

[NodeViewer] LAST LAYER - Applied quaternion to mesh: {
  layerY: 8.034,
  quaternion: [qx, qy, qz, qw],
  theta: 1.371,
  thetaDeg: 78.57,
  position: [x, y, z]
}
```

### What to Check

✅ **Quaternions should match** those from Stage 1 (buildNodes)
✅ **Theta values should match** tilt angles from tilt summary
❌ **If quaternions differ** from Stage 1, something modified them in the pipeline
❌ **If quaternions are correct but visual is wrong**, the issue is in mesh rendering or Three.js

---

## 🔧 How to Use This System

### Step 1: Generate Nodes
1. Create a sphere object
2. Generate layers
3. Generate nodes
4. Open browser console (F12)

### Step 2: Review Logs in Order

**Check Stage 1 (buildNodes):**
```
[buildNodes] FIRST LAYER - Node 0 quaternion: {...}
[buildNodes] LAST LAYER - Node 0 quaternion: {...}
```

**Check Stage 2 (buildNodeQuaternion):**
```
[buildNodeQuaternion] FIRST LAYER - Tangent consistency check: {...}
[buildNodeQuaternion] LAST LAYER - Tangent consistency check: {...}
```

**Check Stage 3 (planScaffoldChain):**
```
[Node Tilt Summary] Tilt angles for all layers:
[Node Tilt Summary] Key observations: {...}
```

**Check Stage 4 (NodeViewer):**
```
[NodeViewer] FIRST LAYER - Applied quaternion to mesh: {...}
[NodeViewer] LAST LAYER - Applied quaternion to mesh: {...}
```

### Step 3: Compare Values

**Create a comparison table:**

| Stage | First Layer Quat | Last Layer Quat | Match? |
|-------|------------------|-----------------|--------|
| 1. buildNodes | [qx1, qy1, qz1, qw1] | [qx2, qy2, qz2, qw2] | ✅/❌ |
| 2. buildNodeQuaternion | (tangent check) | (tangent check) | ✅/❌ |
| 3. planScaffoldChain | (tilt summary) | (tilt summary) | ✅/❌ |
| 4. NodeViewer | [qx1, qy1, qz1, qw1] | [qx2, qy2, qz2, qw2] | ✅/❌ |

### Step 4: Identify Divergence Point

**If quaternions diverge between stages:**
- **Stage 1 → Stage 4:** Check `applyStrategy`, `adjustNodeSpacing`, `rotateToNearestAnchor`
- **Stage 2 (tangent issue):** Check tangent consistency logic in `buildNodeQuaternion.js`
- **Stage 3 (tilt issue):** Check tilt calculation in `computeTilt.js`
- **Stage 4 (rendering issue):** Check Three.js quaternion application

---

## 🐛 Common Issues and Solutions

### Issue 1: Quaternions Differ Between First and Last Layer (Stage 1)

**Symptom:**
```
First Layer: quaternion: [0.1, 0.2, 0.3, 0.9]
Last Layer:  quaternion: [0.1, -0.2, 0.3, 0.9]  ← Different!
```

**Possible Causes:**
1. Tangent direction is inconsistent (check Stage 2)
2. Hemisphere sign flip logic (should be removed)
3. Normal direction is inverted

**Solution:**
- Check `buildNodeQuaternion.js` tangent consistency logic
- Verify azimuthal direction calculation
- Ensure `finalSign = 1` (no hemisphere flip)

---

### Issue 2: Tangent Flipped Incorrectly (Stage 2)

**Symptom:**
```
First Layer: wasFlipped: false, tangentDotAzimuthal: 0.95
Last Layer:  wasFlipped: false, tangentDotAzimuthal: -0.85  ← Should be flipped!
```

**Possible Causes:**
1. Azimuthal direction calculation is wrong
2. Tangent flip logic is not working
3. Node ordering is reversed

**Solution:**
- Check `azimuthal = up × normal` calculation
- Verify `if (tProjected.dot(azimuthal) < 0)` flip logic
- Check node ordering in `buildNodes.js`

---

### Issue 3: Quaternions Modified in Pipeline (Stage 1 ≠ Stage 4)

**Symptom:**
```
Stage 1: quaternion: [0.1, 0.2, 0.3, 0.9]
Stage 4: quaternion: [0.1, 0.2, 0.3, -0.9]  ← Modified!
```

**Possible Causes:**
1. `applyStrategy` modifies quaternions
2. `adjustNodeSpacing` modifies quaternions
3. `rotateToNearestAnchor` modifies quaternions

**Solution:**
- Check that all functions use spread operator: `{...node, p: newPosition}`
- Verify quaternion is not being overwritten
- Add logging in suspected functions

---

### Issue 4: Tilt Angles Symmetric But Visual Asymmetric

**Symptom:**
```
Tilt Summary: firstVsLast: '82.63° vs 78.57° (diff: 4.06°)' ✅
Visual: Start horizontal, End vertical ❌
```

**Possible Causes:**
1. Quaternions are correct but tangent direction is inconsistent
2. Mesh rotation is being applied incorrectly
3. Additional rotation logic in rendering

**Solution:**
- Check Stage 2 tangent consistency logs
- Verify `finalTangent` points in same direction for both poles
- Check Three.js quaternion application in `NodeViewer.jsx`

---

## 📝 Summary

**Debugging System:**
- Tracks quaternions through 4 stages
- Logs first and last layer data
- Includes tangent consistency checks
- Provides tilt angle summary

**Usage:**
1. Generate nodes for sphere
2. Check console logs in order (Stage 1 → 4)
3. Compare quaternions between stages
4. Identify where divergence occurs
5. Fix root cause at that stage

**Benefits:**
- ✅ Pinpoints exact location of orientation issues
- ✅ Verifies tangent consistency fix is working
- ✅ Confirms quaternions are preserved through pipeline
- ✅ Identifies rendering vs calculation issues

The quaternion pipeline debugging system is now complete! 🎉

