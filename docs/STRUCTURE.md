## Project structure

```
root/
  docs/
    ARCHITECTURE.md           # system architecture notes
    FILES.md                  # file organization guide
    GLOSSARY.md               # terminology definitions
    NODES_STRUCTURE.md        # nodes data model notes
    STRUCTURE.md              # this file
  src/
    App.jsx                   # root app component
    main.jsx                  # app bootstrap
    index.css                 # global styles

    components/               # UI components and 3D viewers
      common/                 # shared UI components
      DevStage/               # 3D CAD editor components
        LayerlineViewer/      # layerline-specific viewer parts
        measurements/         # measurement UI + geometry helpers
        CustomViewCube.jsx    # 3D view controls
        dev-stage.css         # editor-specific styles
        LayerlinePanel.jsx    # layerline controls
        LayerlineViewer.jsx   # main layerline display
        LeftSidebar.jsx       # left panel controls
        MeasurementsOverlay.jsx # measurement overlays
        NodeViewer.jsx        # node visualization
        ResolutionModal.jsx   # resolution settings
        RightSidebar.jsx      # right panel controls
        Scene3D.jsx           # main 3D scene
        SceneObject.jsx       # 3D object wrapper
        StatusBar.jsx         # status information
        TopToolbar.jsx        # top toolbar
        YarnStage.jsx         # yarn selection
      gallery/                # project gallery components
      home/                   # homepage components
      tutorial/               # tutorial components
      ui/                     # reusable UI components
        ui-components.css     # component styles

    constants/
      stitchTypes.js          # stitch type definitions and sizing multipliers

    contexts/
      TransformContext.jsx    # camera/transform context

    hooks/                    # React hooks
      use-mobile.tsx          # mobile detection
      use-toast.ts            # toast notifications

    layerlines/               # layerline geometry + pipeline
      pipeline/               # detection/annotation pipeline stages
        annotateLayers.js     # layer annotation
        index.js              # pipeline orchestration
        labelLayers.js        # layer labeling
        ovalDetector.js       # oval shape detection
        ovalGate.js           # oval entry gate
        perObject.js          # per-object processing
        poles.js              # pole detection
        settings.js            # pipeline settings
        tailSpacing.js         # tail spacing logic
        types.d.ts            # TypeScript definitions
      generators/             # layerline generation entrypoints
        index.js
      intersections/          # layerline intersection utilities
        clip.js               # clipping logic
        connectors.js         # connection building
        fragmentFilter.js     # fragment filtering
        index.js              # intersection exports
        plan.js               # intersection planning
      common.js               # shared utilities
      cone.js                 # cone layerline generation
      intersections.js        # main intersection logic
      pipeline.js             # main pipeline orchestration
      sphere.js               # sphere layerline generation
      stitches.js             # stitch geometry helpers
      triangle.js             # triangle layerline generation

    lib/
      utils.ts                # shared utility functions

    nodes/                    # node generation logic
      final/                  # finalize/aggregate outputs
        index.js
      initial/                # magic ring and initial ring logic
        index.js
        magicRing/            # magic ring specific logic
          firstLayerPlanner.js
          index.js
          magicRing.js
          magicRingNodes.js
      transitions/            # count/distribute/build scaffold between rings
        buildScaffoldSegments.js # scaffold building
        countNextStitches.js  # stitch counting
        distributeNextNodes.js # node distribution
        index.js              # transition exports
        mapBuckets.js         # parent-child mapping
        mapBucketsDeterministic.js # deterministic mapping
      utils/                  # node utilities
        orientNodeToLayerPath.js # node orientation
        rotateLayerStart.js   # layer start rotation
      index.js                # main node exports
      ovalChainScaffold.js    # oval-specific scaffold logic

    services/                 # business logic services
      chainPlan/              # chain planning services
        buildStep.js          # step building
        planChain.js          # chain planning
      scaffoldPipeline/       # scaffold pipeline services
        alignNextRingByAzimuthAxis.js # ring alignment
        buildScaffoldSegments.js # segment building
        buildStep.js          # step building
        helpers.js            # helper functions
        index.js              # pipeline exports
        mapBuckets.js         # mapping logic
        mapConsecutive.js     # consecutive mapping
        planByObject.js       # object-based planning
        planScaffoldChain.js  # chain planning
        planScaffoldChainV2.js # chain planning v2
      stitches/               # stitch services
        computeGauge.js       # gauge computation

    stores/                   # Zustand stores (state + orchestration)
      nodeStore.js            # node generation + planning orchestration
      layerlineStore.js       # layerline settings/state
      sceneStore.js           # 3D scene state
      history.js              # undo/redo

    utils/                    # pure utilities (stateless)
      layers/                 # layer-centric helpers
        circumference.js      # circumference calculations
        index.js              # barrel re-exports
        layerUtils.js         # layer utilities
        tilt.js               # tilt calculations
      nodes/                  # node-centric helpers
        angles.js             # angle calculations
        index.js              # barrel re-exports
        orientation/          # node orientation utilities
          cone.js             # cone orientation
          default.js          # default orientation
          detectPrimaryAxis.js # axis detection
          getQuaternionFromTN.js # quaternion from tangent/normal
          index.js            # orientation exports
          sphere.js           # sphere orientation
        radius.js             # radius calculations
        scaffold.js           # scaffold utilities

  index.html                  # Vite HTML entry
  vite.config.js              # Vite config
  package.json                # dependencies and scripts
  tailwind.config.js          # Tailwind CSS config
  postcss.config.js           # PostCSS config
  tsconfig.json               # TypeScript config
```

## Overview

This app turns detected layerlines (rings/contours in 3D) into crochet node plans and visual scaffolding. It combines:
- **Detection**: build layerlines and annotations from geometry inputs using intersection algorithms
- **Planning**: count/distribute stitches, connect rings with scaffold, and snap to real polylines
- **Visualization**: show nodes, layerlines, measurements, and transitions in 3D using Three.js
- **State**: orchestration with Zustand stores for UI and data management
- **Routing**: hash-based navigation between gallery, tutorial, and CAD editor views

## Conventions

- **components/**: UI only. No business logic. Use React hooks for state management.
- **utils/**: Pure functions, no store or side effects. Stateless helpers only.
- **stores/**: Thin orchestration. Call services/utils, set state. Use Zustand for state management.
- **services/**: Business logic services. Multi-step workflows and complex algorithms.
- **layerlines/ vs nodes/**: Engines and algorithms. Avoid UI/store coupling.
- **Barrel files** (index.js) expose a stable import surface.
- **TypeScript**: Use .ts/.tsx for type safety where beneficial.
- **CSS**: Use Tailwind CSS for styling with custom CSS variables for theming.

## Data flow (high level)

1) **Input Processing**: 3D objects and markers come from the layerline pipeline (`src/layerlines/pipeline/*`)
2) **Layer Generation**: Pipeline detects and generates layerlines using intersection algorithms
3) **Node Planning**: `nodeStore.generateNodesFromLayerlines` orchestrates planning:
   - Derives plane/origin from markers (`utils/layers`)
   - Computes stitch sizes from yarn/stitch type (`constants`, `layerlines/stitches`)
   - Detects special starts (oval gate/detector) to choose strategy
   - Computes initial nodes (magic ring or oval chain)
   - Iterates through subsequent layers to count next stitches, distribute, enforce continuity, and snap endpoints
4) **Scaffold Building**: Connects nodes between layers using serpentine traversal for cut layers
5) **State Updates**: Store updates state for UI consumers; components render nodes/scaffolds and overlays
6) **Visualization**: Three.js renders 3D scene with nodes, scaffolds, and measurement overlays

## How to extend

- **Add a new utility**:
  - Place pure helpers under `src/utils/{nodes|layers}/` and export via the barrel

- **Add a new shape strategy** (recommended future layout):
  - Create `src/domain/shapes/<shape>/` with `nodes.js`, `layers.js`, `schema.js`, and an `index.js`
  - Register it in a shape registry and select by settings

- **Add a new pipeline stage**:
  - Add a module under `src/layerlines/pipeline/` and compose it in `pipeline/index.js`

- **Add a new store-derived view**:
  - Prefer computed selectors/services over embedding logic in the store

- **Add a new component**:
  - Place UI components under `src/components/` with appropriate subfolder
  - Use TypeScript for complex components, JSX for simple ones

- **Add a new service**:
  - Place business logic under `src/services/` with clear separation of concerns

## Key Technologies

- **Frontend**: React 18, Vite, TypeScript
- **3D Graphics**: Three.js, @react-three/drei
- **State Management**: Zustand
- **Styling**: Tailwind CSS, PostCSS
- **Build Tools**: Vite, npm

## Next steps (optional)

- **services/**: Extract multi-step planning flows (e.g., node planning) into shape-agnostic services
- **domain/shapes/**: Co-locate shape-specific rules (magicRing, oval) for nodes and layers under one folder with a registry
- **Testing**: Add unit tests for utilities and integration tests for services
- **Performance**: Optimize 3D rendering and state updates for large patterns


