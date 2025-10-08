# Layer Visibility Debug Guide

## 🎯 Problem Identified

**Issue:** Console shows `S0 = 4` (magic ring has 4 nodes), but the 3D view shows **9 yellow nodes**.

**Root Cause:** The visible nodes are from **Layer 1** (first transition layer), not the magic ring (Layer 0).

---

## 🔍 How Layer Visibility Works

### Layer Visibility Control

The app uses a **vertical slider** on the right side to control which layer is visible:

- **`nodeLayerVisibleCount = 0`** → Shows **Magic Ring** (Layer 0) - Yellow nodes (`#ffaa00`)
- **`nodeLayerVisibleCount = 1`** → Shows **Layer 1** (first transition) - Cyan nodes (`#00aaff`)
- **`nodeLayerVisibleCount = 2`** → Shows **Layer 2** - Cyan nodes (`#00aaff`)
- **`nodeLayerVisibleCount = N`** → Shows **Layer N** - Cyan nodes (`#00aaff`)

### Rendering Logic

**File:** `src/ui/decor/components/nodes/NodeLayers.jsx` (Lines 15-31)

```javascript
const vis = Math.max(0, ui?.nodeLayerVisibleCount || 0)

if (nodes && Array.isArray(nodes.nodes)) {
    if (vis === 0) {
        // Show Magic Ring (Layer 0) - YELLOW
        out.push(
            <NodeViewer 
                key={'mr'} 
                nodeRing0={nodes} 
                color={'#ffaa00'}  // Yellow = Magic Ring
                showNodes={true} 
            />
        )
    } else {
        // vis > 0: Show Layer 1+ from nextLayersPoints - CYAN
        // Magic ring is still rendered but Layer 1+ is shown on top
    }
}

if (vis > 0 && nextLayersPoints.length > 0) {
    for (let i = 0; i < vis; i++) {
        const ring = nextLayersPoints[i]  // Layer 1, 2, 3, etc.
        out.push(
            <NodeViewer
                key={`nx-ring-${i}`}
                nodeRing0={{ nodes: ring.nodes }}
                color={'#00aaff'}  // Cyan = Layer 1+
                showNodes={true}
            />
        )
    }
}
```

---

## 🐛 Debug Logging Added

### 1. NodeLayers.jsx (Lines 21-27)

```javascript
console.log('[NodeLayers] Rendering decision:', {
    'nodeLayerVisibleCount': ui?.nodeLayerVisibleCount,
    'vis': vis,
    'magicRingNodeCount': nodes?.nodes?.length,
    'nextLayersCount': nextLayersPoints?.length,
    'willShowMagicRing': vis === 0,
    'willShowLayer1+': vis > 0,
})
```

**Purpose:** Shows which layer the UI is trying to display

### 2. NodeViewer.jsx (Lines 17-25)

```javascript
console.log('[NodeViewer] Rendering nodes:', {
    'nodeCount': nodeRing0.nodes.length,
    'color': color,
    'isMagicRing': nodeRing0.meta?.isMagicRing,
    'layerY': nodeRing0.meta?.y,
    'isYellow (magic ring)': color === '#ffaa00',
    'isCyan (Layer 1+)': color === '#00aaff',
})
```

**Purpose:** Shows which nodes are actually being rendered and their color

---

## 📊 Expected Console Output

### When Viewing Magic Ring (Slider at 0)

```
[NodeLayers] Rendering decision: {
  nodeLayerVisibleCount: 0,
  vis: 0,
  magicRingNodeCount: 4,
  nextLayersCount: 10,
  willShowMagicRing: true,
  willShowLayer1+: false
}

[NodeViewer] Rendering nodes: {
  nodeCount: 4,
  color: "#ffaa00",
  isMagicRing: true,
  isYellow (magic ring): true,
  isCyan (Layer 1+): false
}
```

**Visual Result:** 4 yellow nodes (magic ring)

---

### When Viewing Layer 1 (Slider at 1)

```
[NodeLayers] Rendering decision: {
  nodeLayerVisibleCount: 1,
  vis: 1,
  magicRingNodeCount: 4,
  nextLayersCount: 10,
  willShowMagicRing: false,
  willShowLayer1+: true
}

[NodeViewer] Rendering nodes: {
  nodeCount: 4,
  color: "#ffaa00",
  isMagicRing: true,
  isYellow (magic ring): true,
  isCyan (Layer 1+): false
}

[NodeViewer] Rendering nodes: {
  nodeCount: 9,
  color: "#00aaff",
  isMagicRing: false,
  isYellow (magic ring): false,
  isCyan (Layer 1+): true
}
```

**Visual Result:** 4 yellow nodes (magic ring) + 9 cyan nodes (Layer 1)

**Note:** Both layers are rendered, but Layer 1 (cyan) is more prominent

---

## ✅ Solution: Set Slider to 0

### Step 1: Locate the Layer Slider

The **vertical slider** on the **right side** of the screen controls layer visibility.

**Location:** Right side, near the properties panel

**File:** `src/app/App.jsx` (Lines 282-297)

```javascript
<input 
  type="range" 
  min={0} 
  max={Math.max(0, maxLayers)} 
  value={ui.nodeLayerVisibleCount || 0}
  onChange={(e) => setVisibility({ nodeLayerVisibleCount: Number(e.target.value) })}
  className="layer-slider"
  style={{ 
    position: 'fixed', 
    right: 'calc(210px + 20px)', 
    top: '50%', 
    transform: 'translateY(-50%) rotate(270deg)', 
    width: '40vh', 
    zIndex: 1000 
  }}
/>
```

### Step 2: Set Slider to 0

1. **Find the vertical slider** on the right side of the screen
2. **Drag it all the way down** (to the minimum position)
3. This sets `nodeLayerVisibleCount = 0`
4. **Result:** Only the magic ring (Layer 0) will be visible

### Step 3: Verify in Console

After setting the slider to 0, you should see:

```
[NodeLayers] Rendering decision: {
  nodeLayerVisibleCount: 0,
  vis: 0,
  willShowMagicRing: true,
  willShowLayer1+: false
}

[NodeViewer] Rendering nodes: {
  nodeCount: 4,
  color: "#ffaa00",
  isYellow (magic ring): true
}
```

### Step 4: Visual Verification

- **Count the yellow nodes** - should be exactly **4**
- **No cyan nodes** should be visible
- **Magic ring** should be the only layer shown

---

## 🎨 Color Coding

| Color | Layer | Description |
|-------|-------|-------------|
| **Yellow** (`#ffaa00`) | Layer 0 | Magic Ring (starting stitches) |
| **Cyan** (`#00aaff`) | Layer 1+ | Transition layers (increases/decreases) |

---

## 🔧 Programmatic Solution

If you want to set the slider to 0 programmatically (e.g., in browser console):

```javascript
const { useNodeStore } = await import('./src/app/stores/nodeStore.js')
useNodeStore.getState().setVisibility({ nodeLayerVisibleCount: 0 })
```

---

## 📝 Summary

### Problem
- Console shows `S0 = 4` (magic ring has 4 nodes)
- Visual shows 9 yellow nodes
- **Discrepancy:** Wrong layer is visible

### Root Cause
- `nodeLayerVisibleCount` is set to **1 or higher**
- This shows **Layer 1** (9 nodes) instead of **Magic Ring** (4 nodes)
- The yellow color might be misleading - check console to confirm which layer is actually being rendered

### Solution
1. **Set the vertical slider to 0** (drag all the way down)
2. **Verify in console:** `nodeLayerVisibleCount: 0`
3. **Visual check:** Exactly 4 yellow nodes visible
4. **Console confirms:** `color: "#ffaa00"` and `nodeCount: 4`

### Debug Tools
- **Console logging** shows which layer is being rendered
- **Color coding** helps identify layer type (yellow = MR, cyan = Layer 1+)
- **Slider position** controls which layer is visible

---

## 🚀 Next Steps

1. **Open browser console** (F12 → Console tab)
2. **Check current slider value:**
   ```
   [NodeLayers] Rendering decision: { nodeLayerVisibleCount: ? }
   ```
3. **If `nodeLayerVisibleCount > 0`:**
   - Set slider to 0
   - Verify magic ring is now visible
4. **If `nodeLayerVisibleCount === 0` but still seeing 9 nodes:**
   - Check console for `[NodeViewer]` logs
   - Verify which color is being rendered
   - Check if there are multiple `NodeViewer` instances

---

## 🎓 Key Learnings

### Layer Visibility System
- **Slider controls which layer is visible**, not which nodes within a layer
- **`nodeLayerVisibleCount = 0`** is special: shows magic ring only
- **`nodeLayerVisibleCount > 0`** shows transition layers (Layer 1, 2, 3, etc.)

### Node Count vs. Layer Count
- **Magic Ring node count** is controlled by `magicRingDefaultStitches` setting
- **Layer 1+ node count** is calculated by transition logic (increases/decreases)
- **Different layers have different node counts** based on the pattern

### Color Coding
- **Yellow nodes** = Magic Ring (Layer 0)
- **Cyan nodes** = Transition layers (Layer 1+)
- **Color helps identify** which layer you're looking at

---

## 📚 Related Files

- `src/ui/decor/components/nodes/NodeLayers.jsx` - Layer rendering logic
- `src/ui/editor/NodeViewer.jsx` - Individual node rendering
- `src/app/App.jsx` - Layer slider UI
- `src/app/stores/nodeStore.js` - Node visibility state
- `docs/MAGIC_RING_DEBUG_GUIDE.md` - Magic ring stitch count debugging
- `docs/MAGIC_RING_FIX_SUMMARY.md` - Magic ring setting fix summary

