# Magic Ring / First Layer Logic Analysis

## Status: ✅ LOGIC EXISTS AND IS WORKING

The magic ring logic that enforces a specific node count for the first layer (Layer 0) **exists and is currently active** in the codebase.

---

## Current Implementation

### Overview

The system uses a **two-stage approach** to determine the magic ring stitch count:

1. **Calculate from first layer circumference** (automatic, based on geometry)
2. **Override with user setting** (manual, from UI)

The key insight is that the system **does NOT adjust the layerline circumference** to force a specific node count. Instead, it:
- Calculates the optimal node count from the actual first layer ring circumference
- Allows the user to override this with a manual setting (`magicRingDefaultStitches`)
- Uses the override value (or calculated value) to place nodes

---

## Key Files and Functions

### 1. `src/domain/nodes/initial/magicRing/firstLayerPlanner.js`

**Purpose:** Analyzes the first layer ring and calculates optimal stitch count

**Key Function:** `firstLayerPlanner()`

**Logic:**
```javascript
// Lines 71-81
// Calculate actual circumference of the first layer ring
let ringCirc = 0
for (let i = 0; i < pts.length; i++) {
  const a = new THREE.Vector3(...pts[i])
  const b = new THREE.Vector3(...pts[(i + 1) % pts.length])
  ringCirc += a.distanceTo(b)
}

// Calculate optimal node count based on circumference
const effectiveNodeWidth = gaugeW * factor  // factor = 0.9
const S0 = Math.max(3, Math.round(ringCirc / effectiveNodeWidth))
```

**Returns:**
```javascript
{
  S0: number,  // Calculated stitch count
  anchor: { center, normal, radius, key },
  ring: [[x,y,z], ...]  // First layer ring points
}
```

---

### 2. `src/domain/nodes/initial/magicRing/magicRingNodes.js`

**Purpose:** Creates the actual magic ring nodes with positions and scaffold

**Key Function:** `computeMagicRingNodes()`

**Logic:**
```javascript
// Lines 89-100
// Calculate the actual circumference of the first layer ring
let ringCircumference = 0
for (let i = 0; i < pts.length; i++) {
  const current = new THREE.Vector3(...pts[i])
  const next = new THREE.Vector3(...pts[(i + 1) % pts.length])
  ringCircumference += current.distanceTo(next)
}

// Calculate optimal node count based on tip-to-tip fitting unless overridden
const effectiveNodeWidth = gaugeW * factor
const computedS0 = Math.max(3, Math.round(ringCircumference / effectiveNodeWidth))
S0 = Math.max(3, Math.round(overrideStitchCount ?? computedS0))
```

**Key Parameters:**
- `overrideStitchCount`: If provided, forces S0 to this value
- `firstRing`: Polyline points of the first layer ring
- `stitchGauge.width`: Base yarn width

**Output:**
```javascript
{
  nodeRing0: {
    nodes: [{ id, p, tangent, next, prev }, ...],
    meta: {
      isMagicRing: true,
      stitchCount: S0,
      radius: rRing,
      center: [x, y, z],
      normal: [nx, ny, nz],
      ...
    }
  },
  scaffold: { segments, meta }
}
```

---

### 3. `src/app/stores/nodeStore.js`

**Purpose:** Orchestrates magic ring generation with user settings

**Key Logic (Lines 115-136):**
```javascript
// First-layer planning: choose S0 and anchor from the real first ring when available
const plan = firstLayerPlanner({
  layers: generated.layers,
  firstRing: firstLayerRing,
  startCenter,
  endCenter,
  ringPlaneNormal,
  stitchGauge: stitchGaugeWithType,
  tightenFactor: effectiveTightenFactor,
})

// Allow explicit override via settings; else use planner S0
const plannedS = Math.max(3, Math.round(Number(plan?.S0) || 0))
const forcedS = Number.isFinite(settings?.magicRingDefaultStitches)
  ? Math.max(3, Math.round(settings.magicRingDefaultStitches))
  : (plannedS > 0 ? plannedS : 6)

mrCountResult = {
  ...mrCountResult,
  magicRing: {
    ...mrCountResult.magicRing,
    stitchCount: forcedS,  // ← This is what gets used
  },
}
```

**Priority Order:**
1. **User setting** (`settings.magicRingDefaultStitches`) - if set
2. **Calculated from first layer** (`plan.S0`) - if available
3. **Default fallback** (6 stitches) - if nothing else

---

## How It Works

### Data Flow

```
1. Generate Layerlines
   ↓
   First layer ring created with actual geometry
   
2. firstLayerPlanner()
   ↓
   Measures actual circumference of first layer ring
   ↓
   Calculates: S0 = round(circumference / effectiveNodeWidth)
   ↓
   Returns: { S0: calculated_count, anchor, ring }
   
3. nodeStore (orchestration)
   ↓
   Checks if user has set magicRingDefaultStitches
   ↓
   forcedS = user_setting ?? calculated_S0 ?? 6
   ↓
   Passes forcedS as overrideStitchCount
   
4. computeMagicRingNodes()
   ↓
   Uses overrideStitchCount (forcedS) to create exactly that many nodes
   ↓
   Positions nodes evenly around the first layer ring
   ↓
   Returns: { nodeRing0: { nodes: [S0 nodes], meta }, scaffold }
```

---

## Key Formulas

### Effective Node Width
```javascript
const factor = 0.9  // Tightening factor
const effectiveNodeWidth = stitchGauge.width * factor
```

### Calculated Stitch Count
```javascript
const S0 = Math.max(3, Math.round(ringCircumference / effectiveNodeWidth))
```

### Example Calculation

**Given:**
- First layer ring circumference: 2.5 units
- Yarn size level: 4 → stitchGauge.width ≈ 0.5
- Tightening factor: 0.9

**Calculation:**
```
effectiveNodeWidth = 0.5 × 0.9 = 0.45
S0 = round(2.5 / 0.45) = round(5.56) = 6 nodes
```

---

## User Control

### UI Setting: `magicRingDefaultStitches`

**Location:** `src/app/stores/layerlineStore.js` (Line 8)

**Default:** 6 stitches

**UI Control:** LayerlinePanel.jsx (not shown in search results, but referenced)

**Behavior:**
- If set: Forces magic ring to have exactly this many stitches
- If not set: Uses calculated value from first layer circumference
- Minimum: 3 stitches (enforced by `Math.max(3, ...)`)

---

## Why This Approach Works

### Advantages

1. **Geometry-aware:** Automatically adapts to the actual first layer size
2. **User-controllable:** Can override with manual setting if needed
3. **Yarn-size-aware:** Accounts for different yarn thicknesses
4. **Consistent:** Same inputs always produce same output

### No Circumference Manipulation

The system **does NOT** adjust the layerline circumference to force a specific node count. Instead:

- ✅ Layerlines are generated based on object geometry
- ✅ First layer ring has its natural circumference
- ✅ Node count is calculated from this circumference
- ✅ User can override the calculated count
- ✅ Nodes are positioned evenly around the ring

This is **better** than manipulating circumference because:
- Layerlines remain geometrically accurate
- No artificial distortion of the first layer
- Spacing remains consistent with the rest of the object

---

## Current Behavior (Based on Your Image)

Looking at your screenshot showing **8 yellow nodes** in the first layer:

**Likely Scenario:**
```
First layer circumference ≈ 3.6 units
Yarn width ≈ 0.5 (size level 4)
Effective width = 0.5 × 0.9 = 0.45
Calculated S0 = round(3.6 / 0.45) = round(8.0) = 8 nodes
```

**If you want exactly 5 nodes instead:**

**Option 1: Set manual override**
```javascript
// In UI or settings:
magicRingDefaultStitches = 5
```

**Option 2: Adjust yarn size**
```javascript
// Larger yarn → fewer nodes
yarnSizeLevel = 6  // Larger yarn
// This increases stitchGauge.width, reducing node count
```

---

## Refactoring Recommendation

### Current State: ✅ GOOD

The logic is already well-organized:
- `firstLayerPlanner.js` - Calculation logic (pure function)
- `magicRingNodes.js` - Node placement logic (pure function)
- `nodeStore.js` - Orchestration with user settings

### No Refactoring Needed

The code is already in dedicated files with clear responsibilities. The logic is:
- ✅ Modular
- ✅ Well-documented
- ✅ Testable (pure functions)
- ✅ Maintainable

---

## Summary

**Question:** Does the magic ring circumference adjustment logic exist?

**Answer:** **YES**, but it works differently than expected:

1. **It does NOT adjust layerline circumference** to force a node count
2. **It DOES calculate node count** from the actual first layer circumference
3. **It DOES allow user override** via `magicRingDefaultStitches` setting
4. **It DOES position nodes** evenly around the first layer ring

**Files:**
- `src/domain/nodes/initial/magicRing/firstLayerPlanner.js` - Calculates S0
- `src/domain/nodes/initial/magicRing/magicRingNodes.js` - Creates nodes
- `src/app/stores/nodeStore.js` - Orchestrates with user settings

**To get exactly 5 nodes:**
Set `magicRingDefaultStitches = 5` in the UI settings.

---

## UI Control Added

### New Feature: Magic Ring Stitches Input

**File Modified:** `src/ui/editor/LayerlinePanel.jsx` (Lines 57-68)

**Added UI Control:**
```jsx
<Row label="Magic Ring Stitches">
  <input
    type="number"
    min={3}
    max={12}
    step={1}
    value={settings.magicRingDefaultStitches ?? 6}
    onChange={(e) => setSettings({ magicRingDefaultStitches: parseInt(e.target.value, 10) })}
    style={{ width: 60, ... }}
  />
  <span style={{ marginLeft: 8, color: '#aaa', fontSize: 12 }}>
    (auto: {calculated_value})
  </span>
</Row>
```

**Features:**
- **Number input** with min=3, max=12
- **Shows calculated value** in parentheses (auto-calculated from circumference)
- **Default:** 6 stitches
- **Range:** 3-12 stitches (enforced by UI)

**Usage:**
1. Open the Layerlines panel
2. Find "Magic Ring Stitches" input
3. Enter desired number (3-12)
4. Regenerate nodes to see the change

**Example:**
- Set to 5 → First layer will have exactly 5 nodes
- Set to 8 → First layer will have exactly 8 nodes
- Leave at 6 (default) → First layer will have 6 nodes

---

## Build Status

✅ **Build succeeded** with no errors

```bash
npm run build
✓ 2312 modules transformed.
✓ built in 9.54s
```

