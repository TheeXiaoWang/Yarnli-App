# Sphere Tilt Pipeline

## Purpose

This pipeline consolidates all sphere-specific node rotation/tilt calculation logic into a single, cohesive module. It handles:

1. **Pre-calculation** of layer radii and axial positions
2. **Tilt calculation** using squared radius-delta weighting
3. **Debug logging** for tilt analysis and verification
4. **Data collection** for console table output

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Sphere Tilt Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: orderedLayers, sphereCenter, axis                   │
│     ↓                                                         │
│  1. Pre-calculate layer radii & axial positions              │
│     ↓                                                         │
│  2. For each layer:                                          │
│     - Calculate tilt using computeTiltFromRadiusDeltas()     │
│     - Collect tilt data for logging                          │
│     ↓                                                         │
│  3. Output tilt data & debug logs                            │
│     ↓                                                         │
│  Output: { getTiltForLayer(), tiltDataByLayer }             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Files

- **`sphereTiltPipeline.js`** - Main pipeline orchestrator
- **`preCalculateLayerData.js`** - Pre-calculation of radii and axial positions
- **`computeTilt.js`** - Core tilt calculation (moved from nodeOrientation)
- **`tiltLogger.js`** - Console logging and debugging
- **`README.md`** - This file

## Usage

```javascript
import { createSphereTiltPipeline } from './services/sphereTiltPipeline/sphereTiltPipeline'

// Initialize pipeline with layer data
const tiltPipeline = createSphereTiltPipeline({
  orderedLayers,
  sphereCenter,
  axis,
  axisOrigin
})

// Get tilt for a specific layer
const { rollAngle, ratio } = tiltPipeline.getTiltForLayer(layerIndex)

// Access pre-calculated data
const allLayerRadii = tiltPipeline.getAllLayerRadii()
const allLayerAxialPositions = tiltPipeline.getAllLayerAxialPositions()

// Log tilt data (in development mode)
tiltPipeline.logTiltData()
```

## Integration Points

### From `planScaffoldChain.js`:
- Calls `createSphereTiltPipeline()` once at the beginning
- Uses `getTiltForLayer()` for each layer during node generation
- Calls `logTiltData()` at the end for debugging

### From `buildStep.js`:
- Receives `rollAngle` from pipeline via `planScaffoldChain.js`
- No longer calls `computeTiltFromRadiusDeltas()` directly

### From `buildNodes.js`:
- Receives `rollAngle` via `overrideRollAngle` parameter (unchanged)

## Benefits

1. **Consolidation**: All tilt logic in one place
2. **Reusability**: Pipeline can be used for any sphere object
3. **Maintainability**: Easy to modify tilt algorithm without touching other files
4. **Testability**: Pipeline can be tested independently
5. **Clarity**: Clear separation of concerns

