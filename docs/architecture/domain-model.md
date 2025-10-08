## Project structure

```
root/
  docs/
    ARCHITECTURE.md
    FILES.md
    GLOSSARY.md
    NODES_STRUCTURE.md
    STRUCTURE.md

  src/
    app/
      App.jsx
      main.jsx
      index.css
      contexts/
        TransformContext.jsx
      hooks/
        use-mobile.tsx
        use-toast.ts
      stores/
        history.js
        layerlineStore.js
        nodeStore.js
        sceneStore.js

    ui/
      editor/
        CustomViewCube.jsx
        LayerlinePanel.jsx
        LayerlineViewer.jsx
        LayerlineViewer/
          index.js
          labels.js
          Pole.jsx
          Ring0Overlay.jsx
          RingLines.jsx
        LeftSidebar.jsx
        MeasurementsOverlay.jsx
        measurements/
          compute.js
          geometry/
            anchors.js
            stableAnchors.js
            stackAnchors.js
          grouping/
            groupByObject.js
          pipes/
            baseline.js
            generic.js
            sideways.js
            sphere.js
          filters/
            layers.js
          utils.js
        NodeViewer.jsx
        ResolutionModal.jsx
        RightSidebar.jsx
        Scene3D.jsx
        SceneObject.jsx
        StatusBar.jsx
        TopToolbar.jsx
        YarnStage.jsx
      gallery/
      home/
      tutorial/
      common/
      ui-components.css

    constants/
      orientation.js        # MODEL_TO_CANON_Q etc
      stitchTypes.js

    domain/
      layerlines/
        circumference.js
        pipeline.js
        pipeline/
          annotateLayers.js
          labelLayers.js
          ovalDetector.js
          ovalGate.js
          perObject.js
          poles.js
          settings.js
          tailSpacing.js
          types.d.ts
        intersections/
          clip.js
          connectors.js
          fragmentFilter.js
          index.js
          plan.js
        intersections.js
        layerUtils.js
        stitches.js
        tilt.js
      nodes/
        initial/
          index.js
          magicRing/
            firstLayerPlanner.js
            index.js
            magicRing.js
            magicRingNodes.js
        transitions/
          buildScaffoldSegments.js
          countNextStitches.js
          distributeNextNodes.js
          index.js
          mapBuckets.js
          mapBucketsDeterministic.js
        utils/
          angles.js
          index.js
          orientation/
            cone.js
            default.js
            detectPrimaryAxis.js
            getQuaternionFromTN.js
            index.js
            sphere.js
          orientNodeToLayerPath.js
          radius.js
          rotateLayerStart.js
          scaffold.js
      shapes/
        cone/
          layers.js
        sphere/
          layers.js
        triangle/
          layers.js
        index.js

    lib/
      utils.ts

    services/
      nodePlanning/
        buildStep.js          # per-layer step for normal planning
        planChain.js          # plan across layers (tip→base)
      scaffoldPlanning/       # oval/complex chain scaffolding only
        alignNextRingByAzimuthAxis.js
        buildScaffoldSegments.js
        buildStep.js
        helpers/
          mapping.js
          polylineUtils.js
        helpers.js
        index.js
        mapBuckets.js
        mapConsecutive.js
        planByObject.js
        planScaffoldChain.js
        planScaffoldChainV2.js
      nodeOrientation/
        buildNodeQuaternion.js
        computeTilt.js        # tilt/roll helpers (centralized)
        orientation.js        # legacy orientation (kept for reference)
        orientationUtils.js
      nodes/
        buildNodes.js
        mapping.js
      stitches/
        computeGauge.js

    utils/
      index.js
      math/
        index.js
      nodes/
        orientation/
          applyRotisserieSpin.js
          getQuaternionFromTN.js

  index.html
  vite.config.js
  package.json
  tailwind.config.js
  postcss.config.js
  tsconfig.json
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
3) **Node Planning**: `services/nodePlanning/planChain` (default) walks layers along the axis:
   - Per layer: `countNextStitches` → `distributeNextNodes` → mapping → `services/nodes/buildNodes`
   - `buildNodes` uses `nodeOrientation/computeTilt.js` and `buildNodeQuaternion.js` to bake quaternions
   - For oval/cut rings, `services/scaffoldPlanning/*` provides an alternate chain planner
4) **Scaffold Building**: Connects nodes between layers with parent→child segments; for cut layers uses serpentine traversal
5) **State Updates**: Store updates state for UI consumers; components render nodes/scaffolds and overlays
6) **Visualization**: Three.js renders 3D scene with nodes, scaffolds, and measurement overlays

## How to extend

- **Add a new utility**:
  - Place pure helpers under `src/utils/{nodes|layers}/` and export via the barrel

-- **Add a new shape strategy**:
  - Create `src/domain/shapes/<shape>/layers.js` and register in `src/domain/shapes/index.js`

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


