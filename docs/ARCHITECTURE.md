## Architecture

### Core modules

- layerlines/
  - Builds geometric layers from input meshes/markers
  - Pipeline stages annotate and filter rings for downstream planning

- nodes/
  - Initial: magic ring/oval chain entry points
  - Transitions: stitch counting, distribution, and scaffold mapping between rings
  - Final: aggregates outputs

- stores/
  - nodeStore: orchestrates planning from layerline outputs, sets state for UI
  - layerlineStore: holds layerline settings and results
  - sceneStore/history: scene interaction and undo/redo

- utils/
  - nodes/: stateless math and geometry helpers for nodes/scaffold
  - layers/: layer/ring selection and pole/plane derivation

### Planning pipeline

1) Derive plane/origin from markers (utils/layers.deriveStartAndNormal)
2) Determine stitch gauge from `stitchTypes.js` and yarn size
3) Detect special starts (layerlines/pipeline/ovalDetector + ovalGate)
4) Generate initial ring nodes (nodes/initial/magicRing or oval chain)
5) For each subsequent layer:
   - Count next stitches (nodes/transitions/countNextStitches)
   - Distribute evenly on ideal circle (nodes/transitions/distributeNextNodes)
   - Build monotonic scaffold (nodes/transitions/buildScaffoldSegments)
   - Enforce continuity and snap to actual polyline (utils/nodes.scaffold + utils/measurements.nearestPointOnPolyline)
6) Persist results and per-layer metrics to the store

### Rendering

- Scene3D and overlays read from `nodeStore` and `layerlineStore`
- UI toggles live under `nodeStore.ui` to control visibility

### Extension points

- New shapes: add co-located shape rules (nodes + layers) and select via settings
- New pipeline stages: add modules under `layerlines/pipeline`
- Services: extract multi-step flows into `src/services/` to keep stores thin


