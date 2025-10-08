# Current Repository Structure

```
New_CrochetCAD123/                          # 🏠 ROOT DIRECTORY
│
├── 📄 .gitignore                           # Git ignore rules
├── 📄 LICENSE                              # AGPL-3.0 license
├── 📄 README.md                            # Main project documentation
├── 📄 CONTRIBUTING.md                      # Contribution guidelines
├── 📄 package.json                         # NPM dependencies & scripts
├── 📄 package-lock.json                    # Locked dependency versions
├── 📄 tsconfig.json                        # TypeScript configuration
├── 📄 vite.config.js                       # Vite build configuration
├── 📄 tailwind.config.js                   # Tailwind CSS configuration
├── 📄 postcss.config.js                    # PostCSS configuration
├── 📄 vercel.json                          # Vercel deployment config
├── 📄 build.js                             # Custom build script
├── 📄 index.html                           # HTML entry point
│
├── 📁 dist/                                # 🔨 Build output (excluded from git)
│   ├── assets/
│   └── index.html
│
├── 📁 node_modules/                        # 📦 NPM dependencies (excluded from git)
│
├── 📁 docs/                                # 📚 DOCUMENTATION
│   ├── ARCHITECTURE.md                     # System architecture overview
│   ├── GLOSSARY.md                         # Terminology reference
│   ├── FILES.md                            # File organization guide
│   ├── STRUCTURE.md                        # Code structure documentation
│   ├── NODES_STRUCTURE.md                  # Node data format specs
│   ├── COLOR_REFERENCE.md                  # Color system documentation
│   ├── STITCH_TYPE_COLORS.md               # Stitch type color mapping
│   ├── STITCH_TYPE_SPACING.md              # Stitch spacing algorithms
│   ├── LAYER_STRATEGIES.md                 # Layer generation strategies
│   │
│   └── 🔧 Debug/Bugfix Documentation (should be reorganized)
│       ├── BUGFIX_SETTINGS_UNDEFINED.md
│       ├── COMPREHENSIVE_TILT_LOGGING.md
│       ├── DEBUG_NODE_ORIENTATION.md
│       ├── DYNAMIC_LAYER0_POSITIONING.md
│       ├── FIXED_REFERENCE_DIRECTION_FIX.md
│       ├── IMPLEMENTATION_SUMMARY.md
│       ├── LAYER_LEVEL_TANGENT_CONSISTENCY.md
│       ├── LAYER_SPACING_FIX.md
│       ├── LAYER_VISIBILITY_DEBUG.md
│       ├── LAYER_VISIBILITY_QUICK_FIX.md
│       ├── MAGIC_RING_DEBUG_GUIDE.md
│       ├── MAGIC_RING_FIX_SUMMARY.md
│       ├── MAGIC_RING_LOGIC_ANALYSIS.md
│       ├── NODE_ORIENTATION_FIX.md
│       ├── NODE_TILT_FIX.md
│       ├── QUATERNION_PIPELINE_DEBUGGING.md
│       ├── SPACING_TIGHTENING.md
│       ├── SYMMETRIC_TILT_FIX.md
│       ├── TANGENT_CONSISTENCY_FIX.md
│       ├── TILT_CALCULATION_AUDIT.md
│       ├── TILT_FIX_CLEANUP_SUMMARY.md
│       └── TILT_FORMULA_FIX.md
│
└── 📁 src/                                 # 💻 SOURCE CODE
    │
    ├── 📁 app/                             # ⚙️ APPLICATION CORE
    │   ├── App.jsx                         # Root React component
    │   ├── main.jsx                        # Application entry point
    │   ├── index.css                       # Global styles & design system
    │   │
    │   ├── 📁 stores/                      # State management (Zustand)
    │   │   ├── sceneStore.js               # 3D scene state (objects, camera, selection)
    │   │   ├── layerlineStore.js           # Layerline generation state
    │   │   ├── nodeStore.js                # Node planning & scaffold state
    │   │   ├── decorStore.js               # 🔒 Decoration/plushie state (PRIVATE)
    │   │   └── history.js                  # Undo/redo functionality
    │   │
    │   ├── 📁 contexts/                    # React contexts
    │   │   └── TransformContext.jsx        # Transform mode context
    │   │
    │   ├── 📁 hooks/                       # Custom React hooks
    │   │   ├── use-mobile.tsx              # Mobile detection hook
    │   │   └── use-toast.ts                # Toast notification hook
    │   │
    │   └── 📁 utils/                       # App-level utilities
    │       └── sourceResolver.js           # Source context resolution
    │
    ├── 📁 ui/                              # 🎨 USER INTERFACE COMPONENTS
    │   ├── ui-components.css               # Component-specific styles
    │   │
    │   ├── 📁 editor/                      # CAD Editor UI (PUBLIC)
    │   │   ├── Scene3D.jsx                 # Main 3D scene component
    │   │   ├── SceneObject.jsx             # Individual 3D object renderer
    │   │   ├── YarnStage.jsx               # Yarn grid stage
    │   │   ├── TopToolbar.jsx              # Top toolbar
    │   │   ├── LeftSidebar.jsx             # Left tools sidebar
    │   │   ├── RightSidebar.jsx            # Right properties sidebar
    │   │   ├── StatusBar.jsx               # Bottom status bar
    │   │   ├── CustomViewCube.jsx          # 3D view cube control
    │   │   ├── ResolutionModal.jsx         # Resolution settings modal
    │   │   ├── NodeViewer.jsx              # Node visualization component
    │   │   ├── LayerlinePanel.jsx          # Layerline control panel
    │   │   ├── dev-stage.css               # Editor-specific styles
    │   │   │
    │   │   ├── 📁 LayerlineViewer/         # Layerline visualization
    │   │   │   ├── index.js
    │   │   │   ├── labels.js
    │   │   │   ├── Pole.jsx
    │   │   │   ├── Ring0Overlay.jsx
    │   │   │   └── RingLines.jsx
    │   │   │
    │   │   └── 📁 measurements/            # Measurement overlays
    │   │       ├── compute.js
    │   │       ├── utils.js
    │   │       ├── 📁 geometry/
    │   │       │   ├── anchors.js
    │   │       │   ├── stableAnchors.js
    │   │       │   └── stackAnchors.js
    │   │       ├── 📁 grouping/
    │   │       │   └── groupByObject.js
    │   │       ├── 📁 pipes/
    │   │       │   ├── baseline.js
    │   │       │   ├── generic.js
    │   │       │   ├── sideways.js
    │   │       │   └── sphere.js
    │   │       └── 📁 filters/
    │   │           └── layers.js
    │   │
    │   ├── 📁 decor/                       # 🔒 DECORATION UI (PRIVATE - Plushie features)
    │   │   ├── DecorPage.jsx
    │   │   ├── DecorScene.jsx
    │   │   ├── DecorSidebar.jsx
    │   │   ├── SceneLayersPanel.jsx
    │   │   ├── SelectionPropertiesPanel.jsx
    │   │   └── 📁 components/
    │   │       ├── 📁 eyes/                # Eye decoration components
    │   │       ├── 📁 felt/                # Felt shape components
    │   │       ├── 📁 yarn/                # Yarn visualization
    │   │       ├── 📁 grid/                # Grid placement
    │   │       ├── 📁 nodes/               # Node layers
    │   │       └── 📁 source/              # Source object handling
    │   │
    │   ├── 📁 home/                        # Landing page
    │   ├── 📁 gallery/                     # Gallery page
    │   ├── 📁 tutorial/                    # Tutorial page
    │   └── 📁 common/                      # Shared UI components
    │
    ├── 📁 domain/                          # 🧠 CORE CROCHET LOGIC (PUBLIC - Core algorithms)
    │   │
    │   ├── 📁 layerlines/                  # Layer generation algorithms
    │   │   ├── index.js                    # Barrel exports
    │   │   ├── pipeline.js                 # Main pipeline orchestrator
    │   │   ├── circumference.js            # Circumference calculations
    │   │   ├── stitches.js                 # Stitch dimension calculations
    │   │   ├── tilt.js                     # Tilt angle calculations
    │   │   ├── layerUtils.js               # Layer utility functions
    │   │   ├── resampleByStitchWidth.js    # Stitch-aware resampling
    │   │   │
    │   │   ├── 📁 pipeline/                # Pipeline stages
    │   │   │   ├── index.js
    │   │   │   ├── settings.js
    │   │   │   ├── perObject.js
    │   │   │   ├── poles.js
    │   │   │   ├── annotateLayers.js
    │   │   │   ├── labelLayers.js
    │   │   │   ├── tailSpacing.js
    │   │   │   ├── ovalDetector.js
    │   │   │   ├── ovalGate.js
    │   │   │   ├── unifiedLayerGenerator.js
    │   │   │   └── types.d.ts
    │   │   │
    │   │   └── 📁 intersections/           # Intersection algorithms
    │   │       ├── index.js
    │   │       ├── plan.js
    │   │       ├── clip.js
    │   │       ├── connectors.js
    │   │       └── fragmentFilter.js
    │   │
    │   ├── 📁 nodes/                       # Node placement algorithms
    │   │   │
    │   │   ├── 📁 initial/                 # Initial node generation
    │   │   │   ├── index.js
    │   │   │   └── 📁 magicRing/
    │   │   │       ├── index.js
    │   │   │       ├── magicRing.js
    │   │   │       ├── magicRingNodes.js
    │   │   │       └── firstLayerPlanner.js
    │   │   │
    │   │   ├── 📁 transitions/             # Layer-to-layer transitions
    │   │   │   ├── index.js
    │   │   │   ├── countNextStitches.js
    │   │   │   ├── distributeNextNodes.js
    │   │   │   ├── buildScaffoldSegments.js
    │   │   │   ├── mapBuckets.js
    │   │   │   └── mapBucketsDeterministic.js
    │   │   │
    │   │   └── 📁 utils/                   # Node utilities
    │   │       ├── index.js
    │   │       ├── angles.js
    │   │       ├── radius.js
    │   │       ├── scaffold.js
    │   │       ├── rotateLayerStart.js
    │   │       ├── orientNodeToLayerPath.js
    │   │       └── 📁 orientation/
    │   │           ├── index.js
    │   │           ├── default.js
    │   │           ├── sphere.js
    │   │           ├── cone.js
    │   │           ├── detectPrimaryAxis.js
    │   │           └── getQuaternionFromTN.js
    │   │
    │   └── 📁 shapes/                      # Shape-specific generators
    │       ├── 📁 sphere/
    │       │   └── layers.js
    │       ├── 📁 cone/
    │       │   └── layers.js
    │       ├── 📁 cylinder/
    │       │   └── layers.js
    │       ├── 📁 capsule/
    │       │   └── layers.js
    │       ├── 📁 pyramid/
    │       │   └── layers.js
    │       ├── 📁 triangle/
    │       │   └── layers.js
    │       └── 📁 torus/
    │           └── layers.js
    │
    ├── 📁 services/                        # 🔧 BUSINESS LOGIC SERVICES (PUBLIC)
    │   │
    │   ├── 📁 nodeOrientation/             # Node orientation calculations
    │   │   ├── computeTilt.js
    │   │   └── buildNodeQuaternion.js
    │   │
    │   ├── 📁 nodePlanning/                # Node planning workflows
    │   │   └── planChain.js
    │   │
    │   ├── 📁 scaffoldPlanning/            # Scaffold generation
    │   │   └── (scaffold planning logic)
    │   │
    │   ├── 📁 sphereTiltPipeline/          # Sphere tilt calculations
    │   │   └── (tilt pipeline logic)
    │   │
    │   ├── 📁 nodes/                       # Node building services
    │   │   └── buildNodes.js
    │   │
    │   └── 📁 stitches/                    # Stitch services
    │       └── (stitch logic)
    │
    ├── 📁 constants/                       # 📊 CONSTANTS & CONFIGURATION
    │   ├── stitchTypes.js                  # Stitch type definitions
    │   └── orientation.js                  # Orientation constants
    │
    ├── 📁 utils/                           # 🛠️ SHARED UTILITIES (PUBLIC)
    │   ├── index.js                        # Barrel exports
    │   ├── 📁 math/                        # Math utilities
    │   └── 📁 nodes/                       # Node-specific utilities
    │
    └── 📁 lib/                             # 📚 LIBRARY UTILITIES
        └── utils.ts                        # TypeScript utilities
```

## 🔑 Key Observations

### ✅ Public-Ready Code (Can be open-sourced)
- **src/domain/** - Core crochet algorithms (layerlines, nodes, shapes)
- **src/services/** - Business logic services
- **src/utils/** - Shared utilities
- **src/constants/** - Configuration
- **src/ui/editor/** - CAD editor UI
- **src/ui/home/**, **src/ui/gallery/**, **src/ui/tutorial/** - Public pages
- **src/app/** (mostly) - Application core

### 🔒 Private/Proprietary Code (Should be separated)
- **src/ui/decor/** - Entire decoration/plushie UI system
- **src/app/stores/decorStore.js** - Decoration state management
- Any plushie-specific assets, eyes, felt shapes, etc.

### 📚 Documentation Issues
- **docs/** contains many debug/bugfix logs mixed with user documentation
- Should reorganize into:
  - `docs/guides/` - User-facing documentation
  - `docs/api/` - API documentation
  - `docs/internal/` - Internal/debug documentation

### ❌ Missing Critical Files
- No `CODE_OF_CONDUCT.md`
- No `SECURITY.md`
- No `.github/` folder (issue templates, PR templates, workflows)
- No `CHANGELOG.md`
- No test files
- No linting configuration

