## Project structure

```
root/
  docs/
    NODES_STRUCTURE.md        # nodes data model notes
    STRUCTURE.md              # this file
  src/
    App.jsx                   # root app component
    main.jsx                  # app bootstrap
    index.css                 # global styles

    components/               # UI components and 3D viewers
      LayerlineViewer/        # layerline-specific viewer parts
      measurements/           # measurement UI + geometry helpers

    constants/
      stitchTypes.js          # stitch type definitions and sizing multipliers

    contexts/
      TransformContext.jsx    # camera/transform context

    layerlines/               # layerline geometry + pipeline
      pipeline/               # detection/annotation pipeline stages
      generators/             # layerline generation entrypoints
      intersections/          # layerline intersection utilities
      stitches.js             # stitch geometry helpers
      sphere.js|cone.js|...   # primitive layerline shapes

    nodes/                    # node generation logic
      initial/                # magic ring and initial ring logic
      transitions/            # count/distribute/build scaffold between rings
      final/                  # finalize/aggregate outputs
      ovalChainScaffold.js    # oval-specific scaffold logic

    stores/                   # Zustand stores (state + orchestration)
      nodeStore.js            # node generation + planning orchestration
      layerlineStore.js       # layerline settings/state
      sceneStore.js           # 3D scene state
      history.js              # undo/redo

    utils/                    # pure utilities (stateless)
      nodes/                  # node-centric helpers (angles, radius, scaffold)
        angles.js
        radius.js
        scaffold.js
        index.js              # barrel re-exports
      layers/                 # layer-centric helpers
        layerUtils.js
        index.js              # barrel re-exports

  index.html                  # Vite HTML entry
  vite.config.js              # Vite config
  package.json                # dependencies and scripts
```

## Overview

This app turns detected layerlines (rings/contours in 3D) into crochet node plans and visual scaffolding. It combines:
- Detection: build layerlines and annotations from geometry inputs.
- Planning: count/distribute stitches, connect rings with scaffold, and snap to real polylines.
- Visualization: show nodes, layerlines, measurements, and transitions in 3D.
- State: orchestration with Zustand stores.

## Conventions

- components/: UI only. No business logic.
- utils/: Pure functions, no store or side effects.
- stores/: Thin orchestration. Call services/utils, set state.
- layerlines/ vs nodes/: Engines and algorithms. Avoid UI/store coupling.
- Barrel files (index.js) expose a stable import surface.

## Data flow (high level)

1) Inputs (markers, layers) come from the layerline pipeline: `src/layerlines/pipeline/*`.
2) `nodeStore.generateNodesFromLayerlines` orchestrates planning:
   - Derives plane/origin from markers (utils/layers).
   - Computes stitch sizes from yarn/stitch type (constants, layerlines/stitches).
   - Detects special starts (oval gate/detector) to choose strategy.
   - Computes initial nodes (magic ring or oval chain).
   - Iterates through subsequent layers to count next stitches, distribute, enforce continuity, and snap endpoints.
3) Store updates state for UI consumers; components render nodes/scaffolds and overlays.

## How to extend

- Add a new utility:
  - Place pure helpers under `src/utils/{nodes|layers}/` and export via the barrel.

- Add a new shape strategy (recommended future layout):
  - Create `src/domain/shapes/<shape>/` with `nodes.js`, `layers.js`, `schema.js`, and an `index.js`.
  - Register it in a shape registry and select by settings.

- Add a new pipeline stage:
  - Add a module under `src/layerlines/pipeline/` and compose it in `pipeline/index.js`.

- Add a new store-derived view:
  - Prefer computed selectors/services over embedding logic in the store.

## Next steps (optional)

- services/: Extract multi-step planning flows (e.g., node planning) into shape-agnostic services.
- domain/shapes/: Co-locate shape-specific rules (magicRing, oval) for nodes and layers under one folder with a registry.


