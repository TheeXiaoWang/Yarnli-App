## File index (JS files)

Note: Focuses on .js files; .jsx components are summarized in STRUCTURE.md.

### root
- vite.config.js: Vite bundler configuration.

### src
- App.jsx: Root UI component wiring stores and layout.
- main.jsx: App bootstrap and React mounting.
- index.css: Global styles.

### src/constants
- stitchTypes.js: Stitch type profiles (width/height multipliers, metadata).

### src/layerlines
- common.js: Shared helpers for layerline geometry.
- cone.js: Cone-specific layerline generation utilities.
- sphere.js: Sphere-specific layerline utilities.
- triangle.js: Triangle/tri-based helper utilities.
- intersections.js: Aggregate intersections helpers.

#### src/layerlines/generators
- index.js: Entry points to generate layerlines from inputs.

#### src/layerlines/intersections
- clip.js: Polyline clipping operations on layerlines.
- connectors.js: Utilities to connect segments/rings.
- fragmentFilter.js: Filters for removing spurious fragments.
- index.js: Barrel for intersections helpers.
- plan.js: Planning helpers related to intersections.

#### src/layerlines/pipeline
- annotateLayers.js: Adds annotations/metadata to layers.
- index.js: Orchestrates pipeline stages for layerlines.
- labelLayers.js: Assigns labels to rings/layers.
- ovalDetector.js: Detects oval starts from layers and markers.
- ovalGate.js: Logic to choose oval path vs standard MR.
- perObject.js: Per-object processing orchestration.
- poles.js: Parses/validates marker pole inputs.
- settings.js: Pipeline configuration defaults.
- tailSpacing.js: Computes spacing between layer tails.
- types.d.ts: Type hints for pipeline structures (TS).
- pipeline.js: Higher-level pipeline aggregation.

### src/nodes
- index.js: Barrel for nodes modules.
- ovalChainScaffold.js: Builds scaffold for oval start from two rings.

#### src/nodes/initial
- index.js: Barrel for initial node generation.
- magicRing/index.js: Barrel for magic ring implementation.
- magicRing/magicRing.js: Magic ring count and geometry helpers.
- magicRing/magicRingNodes.js: Generates initial MR node positions and scaffold.

#### src/nodes/transitions
- index.js: Barrel for transitions.
- buildScaffoldSegments.js: Maps current→next nodes into monotonic scaffold segments.
- countNextStitches.js: Calculates next-layer stitch counts from circumference and gauge.
- distributeNextNodes.js: Evenly distributes nodes around a ring for a given count.

#### src/nodes/final
- index.js: Barrel for final aggregation.

### src/stores
- history.js: Undo/redo stack utilities.
- layerlineStore.js: Layerline state and settings store.
- sceneStore.js: 3D scene state (camera, selection, toggles).
- nodeStore.js: Orchestrates node planning from layerlines; holds nodes, scaffold, and metrics.

### src/utils

#### src/utils/layers
- index.js: Barrel re-export for layer helpers.
- layerUtils.js: Layer selection and pole/plane derivation helpers.

#### src/utils/nodes
- index.js: Barrel re-export for node helpers.
- angles.js: Angle normalization and ordering utilities.
- radius.js: Ring radius estimations from polylines and markers.
- scaffold.js: Scaffold continuity, snapping, and segment-building helpers.

### src/components/measurements
- compute.js: Measurement computations for the UI overlays.

#### src/components/measurements/filters
- layers.js: Filter utilities for measurement layers.

#### src/components/measurements/geometry
- anchors.js: Compute anchor points for measurement visuals.
- stableAnchors.js: Compute stable anchors across frames.
- stackAnchors.js: Stack grouping of anchors.

#### src/components/measurements/grouping
- groupByObject.js: Groups measurement data by scene object.

#### src/components/measurements/pipes
- baseline.js: Baseline measurement processing.
- generic.js: Generic measurement transformation pipe.
- sideways.js: Sideways measurement transforms.
- sphere.js: Sphere-specific measurement transforms.

#### src/layerlines/pipeline (referenced above) and other component-level utilities
- utils.js: Shared measurement utilities (nearest point, intersections, etc.).


