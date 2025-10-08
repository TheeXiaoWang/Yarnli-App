# Repository Restructuring Plan

## 🎯 Goal
Transform the current monolithic structure into a clean, public-ready multi-package architecture with clear separation between:
- **frontend/** - Public-facing web app
- **engine/** - Core crochet algorithms (can be used standalone)
- **docs/** - Community documentation
- **decor-private/** - Proprietary plushie/decoration features
- **scripts/** - Build and deployment automation

---

## 📋 Detailed Migration Mapping

### 1️⃣ **frontend/** - Public Web Application

**Purpose:** React + Three.js web interface for the CAD tool

**Source → Destination Mapping:**

```
CURRENT                                  →  NEW LOCATION
─────────────────────────────────────────────────────────────────────
src/app/App.jsx                          →  frontend/src/app/App.jsx
src/app/main.jsx                         →  frontend/src/app/main.jsx
src/app/index.css                        →  frontend/src/styles/index.css
index.html                               →  frontend/index.html
vite.config.js                           →  frontend/vite.config.js
tailwind.config.js                       →  frontend/tailwind.config.js
postcss.config.js                        →  frontend/postcss.config.js
tsconfig.json                            →  frontend/tsconfig.json
package.json (modified)                  →  frontend/package.json

src/app/stores/                          →  frontend/src/app/stores/
  ├── sceneStore.js                      →  frontend/src/app/stores/sceneStore.js
  ├── layerlineStore.js                  →  frontend/src/app/stores/layerlineStore.js
  ├── nodeStore.js                       →  frontend/src/app/stores/nodeStore.js
  ├── history.js                         →  frontend/src/app/stores/history.js
  └── decorStore.js                      →  ❌ MOVE TO decor-private/

src/app/contexts/                        →  frontend/src/app/contexts/
src/app/hooks/                           →  frontend/src/app/hooks/
src/app/utils/                           →  frontend/src/app/utils/

src/ui/editor/                           →  frontend/src/pages/editor/
src/ui/home/                             →  frontend/src/pages/home/
src/ui/gallery/                          →  frontend/src/pages/gallery/
src/ui/tutorial/                         →  frontend/src/pages/tutorial/
src/ui/common/                           →  frontend/src/components/common/
src/ui/ui-components.css                 →  frontend/src/styles/ui-components.css

src/ui/decor/                            →  ❌ MOVE TO decor-private/

src/domain/                              →  frontend/src/domain/ (bridge to engine)
  ├── layerlines/                        →  Keep minimal bridge code
  ├── nodes/                             →  Keep minimal bridge code
  └── shapes/                            →  Keep minimal bridge code
  + engineBridge.js (NEW)                →  frontend/src/domain/engineBridge.js

src/constants/                           →  frontend/src/constants/
src/lib/                                 →  frontend/src/lib/
```

**New Files to Create:**
- `frontend/README.md` - Frontend-specific documentation
- `frontend/src/domain/engineBridge.js` - Bridge to engine package
- `frontend/.env.example` - Environment variables template

---

### 2️⃣ **engine/** - Core Crochet Algorithm Library

**Purpose:** Standalone, framework-agnostic crochet pattern generation engine

**Source → Destination Mapping:**

```
CURRENT                                  →  NEW LOCATION
─────────────────────────────────────────────────────────────────────
src/domain/layerlines/                   →  engine/src/layerGen/
  ├── pipeline.js                        →  engine/src/layerGen/pipeline.js
  ├── circumference.js                   →  engine/src/layerGen/circumference.js
  ├── stitches.js                        →  engine/src/layerGen/stitches.js
  ├── tilt.js                            →  engine/src/layerGen/tilt.js
  ├── layerUtils.js                      →  engine/src/layerGen/layerUtils.js
  ├── resampleByStitchWidth.js           →  engine/src/layerGen/resampleByStitchWidth.js
  ├── pipeline/                          →  engine/src/layerGen/pipeline/
  └── intersections/                     →  engine/src/layerGen/intersections/

src/domain/nodes/                        →  engine/src/nodeGen/
  ├── initial/                           →  engine/src/nodeGen/initial/
  ├── transitions/                       →  engine/src/nodeGen/transitions/
  └── utils/                             →  engine/src/nodeGen/utils/

src/domain/shapes/                       →  engine/src/layerGen/shapes/
  ├── sphere/                            →  engine/src/layerGen/shapes/sphere/
  ├── cone/                              →  engine/src/layerGen/shapes/cone/
  ├── cylinder/                          →  engine/src/layerGen/shapes/cylinder/
  ├── capsule/                           →  engine/src/layerGen/shapes/capsule/
  ├── pyramid/                           →  engine/src/layerGen/shapes/pyramid/
  ├── triangle/                          →  engine/src/layerGen/shapes/triangle/
  └── torus/                             →  engine/src/layerGen/shapes/torus/

src/services/                            →  engine/src/
  ├── nodeOrientation/                   →  engine/src/nodeGen/orientation/
  ├── nodePlanning/                      →  engine/src/nodeGen/planning/
  ├── scaffoldPlanning/                  →  engine/src/nodeGen/scaffoldPlanning/
  ├── sphereTiltPipeline/                →  engine/src/layerGen/sphereTilt/
  ├── nodes/                             →  engine/src/nodeGen/builders/
  └── stitches/                          →  engine/src/layerGen/stitches/

src/utils/                               →  engine/src/utils/
  ├── math/                              →  engine/src/utils/math/
  └── nodes/                             →  engine/src/utils/nodes/

src/constants/                           →  engine/src/constants/
  ├── stitchTypes.js                     →  engine/src/constants/stitchTypes.js
  └── orientation.js                     →  engine/src/constants/orientation.js
```

**New Files to Create:**
- `engine/package.json` - Engine package configuration
- `engine/README.md` - Engine API documentation
- `engine/src/index.js` - Main export file
- `engine/tests/` - Test suite directory
- `engine/tsconfig.json` - TypeScript configuration

---

### 3️⃣ **docs/** - Community Documentation

**Purpose:** Organized documentation for contributors and users

**Source → Destination Mapping:**

```
CURRENT                                  →  NEW LOCATION
─────────────────────────────────────────────────────────────────────
README.md                                →  docs/README.md (copy)
CONTRIBUTING.md                          →  docs/CONTRIBUTING.md
LICENSE                                  →  docs/LICENSE (copy)

docs/ARCHITECTURE.md                     →  docs/guides/ARCHITECTURE.md
docs/GLOSSARY.md                         →  docs/guides/GLOSSARY.md
docs/STRUCTURE.md                        →  docs/guides/STRUCTURE.md
docs/NODES_STRUCTURE.md                  →  docs/api/NODES_STRUCTURE.md
docs/FILES.md                            →  docs/guides/FILES.md
docs/COLOR_REFERENCE.md                  →  docs/guides/COLOR_REFERENCE.md
docs/STITCH_TYPE_COLORS.md               →  docs/api/STITCH_TYPE_COLORS.md
docs/STITCH_TYPE_SPACING.md              →  docs/api/STITCH_TYPE_SPACING.md
docs/LAYER_STRATEGIES.md                 →  docs/api/LAYER_STRATEGIES.md

docs/BUGFIX_*.md                         →  docs/internal/bugfixes/
docs/*_FIX*.md                           →  docs/internal/bugfixes/
docs/*_DEBUG*.md                         →  docs/internal/debugging/
docs/IMPLEMENTATION_SUMMARY.md           →  docs/internal/IMPLEMENTATION_SUMMARY.md
```

**New Files to Create:**
- `docs/CODE_OF_CONDUCT.md` - Community code of conduct
- `docs/SECURITY.md` - Security policy
- `docs/CHANGELOG.md` - Version history
- `docs/guides/GETTING_STARTED.md` - Quick start guide
- `docs/guides/DEVELOPMENT.md` - Development setup
- `docs/api/ENGINE_API.md` - Engine API reference
- `docs/api/FRONTEND_API.md` - Frontend API reference

---

### 4️⃣ **decor-private/** - Proprietary Plushie Features

**Purpose:** Private repository for proprietary decoration/plushie assets and logic

**Source → Destination Mapping:**

```
CURRENT                                  →  NEW LOCATION
─────────────────────────────────────────────────────────────────────
src/ui/decor/                            →  decor-private/src/ui/
  ├── DecorPage.jsx                      →  decor-private/src/ui/DecorPage.jsx
  ├── DecorScene.jsx                     →  decor-private/src/ui/DecorScene.jsx
  ├── DecorSidebar.jsx                   →  decor-private/src/ui/DecorSidebar.jsx
  ├── SceneLayersPanel.jsx               →  decor-private/src/ui/SceneLayersPanel.jsx
  ├── SelectionPropertiesPanel.jsx       →  decor-private/src/ui/SelectionPropertiesPanel.jsx
  └── components/                        →  decor-private/src/ui/components/
      ├── eyes/                          →  decor-private/src/ui/components/eyes/
      ├── felt/                          →  decor-private/src/ui/components/felt/
      ├── yarn/                          →  decor-private/src/ui/components/yarn/
      ├── grid/                          →  decor-private/src/ui/components/grid/
      ├── nodes/                         →  decor-private/src/ui/components/nodes/
      └── source/                        →  decor-private/src/ui/components/source/

src/app/stores/decorStore.js             →  decor-private/src/stores/decorStore.js

(Any plushie assets)                     →  decor-private/assets/
  ├── eyes.glb                           →  decor-private/assets/eyes/
  ├── yarn_textures/                     →  decor-private/assets/textures/
  └── icons/                             →  decor-private/assets/icons/
```

**New Files to Create:**
- `decor-private/LICENSE` - Proprietary license
- `decor-private/README.md` - Private module documentation
- `decor-private/package.json` - Package configuration
- `decor-private/.gitignore` - Git ignore rules

---

### 5️⃣ **scripts/** - Build & Deployment Automation

**Source → Destination Mapping:**

```
CURRENT                                  →  NEW LOCATION
─────────────────────────────────────────────────────────────────────
build.js                                 →  scripts/build-frontend.js
vercel.json                              →  frontend/vercel.json
```

**New Files to Create:**
- `scripts/build-engine.js` - Engine build script
- `scripts/deploy-netlify.sh` - Netlify deployment
- `scripts/sync-docs.js` - Documentation sync
- `scripts/test-all.sh` - Run all tests
- `scripts/lint-all.sh` - Lint all packages

---

## 🚀 Migration Steps (Recommended Order)

1. **Create new directory structure** (empty folders)
2. **Set up engine package** (most independent)
3. **Set up frontend package** (depends on engine)
4. **Reorganize docs** (independent)
5. **Extract decor-private** (if applicable)
6. **Create scripts** (automation)
7. **Update root package.json** (monorepo setup)
8. **Test builds** (ensure everything works)
9. **Update CI/CD** (GitHub Actions, Vercel)
10. **Archive old structure** (backup)

---

## ⚠️ Important Considerations

### Dependencies
- **engine/** should have minimal dependencies (Three.js for math only)
- **frontend/** will depend on **engine/** as a package
- **decor-private/** will depend on both **frontend/** and **engine/**

### Import Path Changes
- All imports will need to be updated
- Use find-and-replace carefully
- Consider using a migration script

### Git History
- Use `git mv` to preserve file history
- Consider creating a new branch for restructuring
- Tag the current state before restructuring

### Testing
- Ensure all tests pass after each major move
- Add integration tests for engine package
- Test frontend build with new structure

---

## 📦 Root Package.json (Monorepo)

```json
{
  "name": "yarnli-cad-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "engine",
    "decor-private"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=engine && npm run build --workspace=frontend",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

---

## ✅ Success Criteria

- [ ] All packages build successfully
- [ ] Frontend can import and use engine
- [ ] All tests pass
- [ ] Documentation is organized and accessible
- [ ] Private code is properly separated
- [ ] CI/CD pipelines work
- [ ] No broken imports or missing files

