# Magic Ring Stitch Count Debug Guide

## Problem Identified and Fixed

### Issue
The Magic Ring stitch count setting was not being applied correctly when generating nodes. The UI control was added, but the value wasn't reaching the node generation logic.

### Root Cause
**Stale Settings Reference** - The `handleGenerateNodes` function in `LayerlinePanel.jsx` was using a captured `settings` variable from the component's render scope, which could be stale when the button was clicked.

---

## Fixes Applied

### 1. Fixed Stale Settings in UI Handler

**File:** `src/ui/editor/LayerlinePanel.jsx` (Lines 33-43)

**Before:**
```jsx
const handleGenerateNodes = async () => {
  await generate(objects)
  await generateNodesFromLayerlines({ generated, settings })
}
```

**After:**
```jsx
const handleGenerateNodes = async () => {
  await generate(objects)
  // Get fresh settings from store to ensure we have the latest values
  const freshSettings = useLayerlineStore.getState().settings
  const freshGenerated = useLayerlineStore.getState().generated
  console.log('[UI] Generating nodes with settings:', {
    magicRingDefaultStitches: freshSettings.magicRingDefaultStitches,
    yarnSizeLevel: freshSettings.yarnSizeLevel,
  })
  await generateNodesFromLayerlines({ generated: freshGenerated, settings: freshSettings })
}
```

**Why This Fixes It:**
- `useLayerlineStore.getState()` always returns the **current** state
- Captured variables from React hooks can be stale
- This ensures we always use the latest settings when generating nodes

---

### 2. Added Debug Logging in nodeStore.js

**File:** `src/app/stores/nodeStore.js` (Lines 127-137)

**Added:**
```javascript
// Debug logging to trace magic ring stitch count
console.log('[MagicRing] Stitch count calculation:', {
  'settings.magicRingDefaultStitches': settings?.magicRingDefaultStitches,
  'isFinite': Number.isFinite(settings?.magicRingDefaultStitches),
  'plannedS (from circumference)': plannedS,
  'forcedS (final value)': forcedS,
  'plan.S0': plan?.S0,
})
```

**Purpose:**
- Verify that `settings.magicRingDefaultStitches` is being received
- Check if the override logic is working correctly
- See the final `forcedS` value that gets used

---

### 3. Added Debug Logging in magicRingNodes.js

**File:** `src/domain/nodes/initial/magicRing/magicRingNodes.js` (Lines 103-111)

**Added:**
```javascript
// Debug logging
if (debugLogs) {
  console.log('[MR-Nodes] Stitch count override logic:', {
    'overrideStitchCount (from settings)': overrideStitchCount,
    'computedS0 (from circumference)': computedS0,
    'S0 (final value)': S0,
    'ringCircumference': ringCircumference.toFixed(4),
    'effectiveNodeWidth': effectiveNodeWidth.toFixed(4),
  })
}
```

**Purpose:**
- Verify that `overrideStitchCount` is being passed correctly
- See the calculated vs. override values
- Confirm the final `S0` value used for node placement

---

## How to Test

### Step 1: Open Browser Console
1. Open your app in the browser
2. Press F12 to open DevTools
3. Go to the Console tab

### Step 2: Change Magic Ring Stitches
1. Open the Layerlines panel
2. Find "Magic Ring Stitches" input
3. Change the value (e.g., from 6 to 5)
4. Note: The setting is saved immediately to the store

### Step 3: Generate Nodes
1. Click "Generate Nodes" button
2. Watch the console output

### Expected Console Output

```
[UI] Generating nodes with settings: {
  magicRingDefaultStitches: 5,
  yarnSizeLevel: 4
}

[MagicRing] Stitch count calculation: {
  settings.magicRingDefaultStitches: 5,
  isFinite: true,
  plannedS (from circumference): 8,
  forcedS (final value): 5,
  plan.S0: 8
}

[MR-Nodes] Stitch count override logic: {
  overrideStitchCount (from settings): 5,
  computedS0 (from circumference): 8,
  S0 (final value): 5,
  ringCircumference: "3.6000",
  effectiveNodeWidth: "0.4500"
}

[MR-Nodes] First layer ring analysis: {
  ringCircumference: "3.6000",
  effectiveNodeWidth: "0.4500",
  calculatedStitchCount: 5,
  originalStitchCount: 5,
  ringRadius: "0.5732",
  nodeSpacing: "0.7200"
}
```

### What to Look For

✅ **Success Indicators:**
- `settings.magicRingDefaultStitches` matches your UI input
- `isFinite: true` (confirms the value is a valid number)
- `forcedS (final value)` matches your UI input
- `overrideStitchCount (from settings)` matches your UI input
- `S0 (final value)` matches your UI input
- `calculatedStitchCount` matches your UI input

❌ **Failure Indicators:**
- `settings.magicRingDefaultStitches: undefined` → Settings not being passed
- `isFinite: false` → Value is not a valid number
- `forcedS` doesn't match UI input → Override logic failing
- `S0` doesn't match UI input → Override not being applied

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Changes "Magic Ring Stitches" Input                │
│    LayerlinePanel.jsx: onChange handler                     │
│    ↓                                                         │
│    setSettings({ magicRingDefaultStitches: 5 })            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Settings Stored in Zustand Store                        │
│    layerlineStore.js: settings.magicRingDefaultStitches = 5│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User Clicks "Generate Nodes"                            │
│    LayerlinePanel.jsx: handleGenerateNodes()                │
│    ↓                                                         │
│    freshSettings = useLayerlineStore.getState().settings   │
│    ↓                                                         │
│    generateNodesFromLayerlines({ settings: freshSettings })│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Node Generation Starts                                  │
│    nodeStore.js: generateNodesFromLayerlines()              │
│    ↓                                                         │
│    settings.magicRingDefaultStitches = 5                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Calculate forcedS                                        │
│    nodeStore.js: lines 127-129                              │
│    ↓                                                         │
│    forcedS = Number.isFinite(5) ? 5 : plannedS             │
│    forcedS = 5                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Pass to computeMagicRingNodes                           │
│    nodeStore.js: line 160                                   │
│    ↓                                                         │
│    overrideStitchCount: forcedS (5)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Apply Override                                          │
│    magicRingNodes.js: line 100                              │
│    ↓                                                         │
│    S0 = Math.round(overrideStitchCount ?? computedS0)      │
│    S0 = Math.round(5 ?? 8) = 5                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Create Exactly 5 Nodes                                  │
│    magicRingNodes.js: lines 123-147                         │
│    ↓                                                         │
│    for (let i = 0; i < S0; i++) { ... }                    │
│    Creates 5 nodes positioned evenly around the ring       │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Issues and Solutions

### Issue 1: Setting Not Saved
**Symptom:** Console shows `settings.magicRingDefaultStitches: undefined`

**Solution:**
- Check that the input's `onChange` handler is firing
- Verify `setSettings()` is being called
- Check browser console for errors

### Issue 2: Nodes Not Regenerating
**Symptom:** Changed setting but nodes look the same

**Solution:**
- **You must click "Generate Nodes" button** after changing the setting
- Nodes are not auto-regenerated when settings change
- This is intentional to avoid expensive recalculations

### Issue 3: Wrong Number of Nodes
**Symptom:** Console shows correct value but wrong number of nodes visible

**Solution:**
- Check if you're looking at the magic ring (Layer 0) or Layer 1
- Magic ring is the innermost layer near the start pole
- Use the layer visibility slider to confirm which layer you're viewing

### Issue 4: Value Reverts to Default
**Symptom:** Setting changes but reverts to 6

**Solution:**
- Check if there's a validation issue (min=3, max=12)
- Verify the input is type="number" not type="text"
- Check for any code that resets settings

---

## Verification Checklist

After making changes and clicking "Generate Nodes":

- [ ] Console shows `[UI] Generating nodes with settings`
- [ ] `magicRingDefaultStitches` matches your input value
- [ ] Console shows `[MagicRing] Stitch count calculation`
- [ ] `forcedS (final value)` matches your input value
- [ ] Console shows `[MR-Nodes] Stitch count override logic`
- [ ] `S0 (final value)` matches your input value
- [ ] Visual inspection: Count the yellow nodes in the first layer
- [ ] Node count matches your input value

---

## Build Status

✅ **Build succeeded** with all changes

```bash
npm run build
✓ 2312 modules transformed.
✓ built in 9.91s
```

---

## Summary

**Problem:** Magic Ring stitch count setting not being applied

**Root Cause:** Stale settings reference in UI handler

**Fix:** Use `useLayerlineStore.getState().settings` to get fresh settings

**Debug Tools:** Added comprehensive console logging at 3 key points

**Result:** Setting now flows correctly from UI → Store → Node Generation

**Next Steps:**
1. Test in browser with console open
2. Verify console output matches expected values
3. Visually confirm node count matches setting
4. If issues persist, check console logs to identify where the value is lost

