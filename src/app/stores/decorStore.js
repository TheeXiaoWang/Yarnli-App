import { create } from 'zustand'

// Simple mapping from yarn size level (1-8) to tube radius in scene units
function yarnRadiusFromLevel(level) {
  const n = Math.max(1, Math.min(8, Number(level) || 4))
  return 0.03 + (n - 1) * 0.0075
}

// Generate yarn color based on ID for variety
function generateYarnColor(id) {
  const yarnColors = [
    0xff6b9d, // Pink
    0x9d6bff, // Purple  
    0x6b9dff, // Blue
    0x6bff9d, // Green
    0xff9d6b, // Orange
    0xffff6b, // Yellow
    0xff6b6b, // Red
    0x6bffff, // Cyan
    0xc06bff, // Violet
    0xff6bc0, // Magenta
  ]
  
  const colorIndex = id ? (id % yarnColors.length) : Math.floor(Math.random() * yarnColors.length)
  return yarnColors[colorIndex]
}

export const useDecorStore = create((set, get) => ({
  tool: 'eyes', // 'eyes' | 'yarn' | 'felt'
  showGridPoints: true,
  showGridVectors: false,
  showOnlyNearGridPoints: true,
  showAllGridPoints: false,
  alwaysShowAllNodes: true,
  // Grid vector tuning (degrees). Interpolated per ring from start->end
  gridYawStartDeg: 0,
  gridYawEndDeg: 0,
  // Grid point angular offset (degrees) to rotate grid points around their layer
  gridAngularOffsetDeg: 0,
  eyes: [], // { id, position:[x,y,z], normal:[x,y,z], radius }
  yarns: [], // { id, start:[x,y,z], end:[x,y,z], radius, color }
  feltPieces: [], // { id, shape: [{x,y}], color, position:[x,y,z], normal:[x,y,z], scale, rotation }
  showFeltModal: false,
  feltColor: '#ff6b6b', // Default felt color
  feltScale: 1.0, // Default felt scale (0.1 - 10.0)
  feltRotation: 0, // Default felt rotation in degrees (0 - 360)
  selectedFeltShape: null, // Currently selected shape key (e.g., 'heart', 'star')
  selectedFeltShapeData: null, // Full shape data object
  showCustomShapeEditor: false, // Show/hide custom shape editor drawer
  customShapes: [], // User-created custom shapes
  feltSurfaceHover: null, // Current surface hover state for felt preview { position, normal, object }
  pendingYarnStart: null, // [x,y,z] | null
  pendingYarnStartId: null,
  pendingYarnStartSourceObject: null, // source object for pending yarn start
  selectedYarnId: null, // Currently selected yarn for editing/deletion
  selectedEyeId: null, // Currently selected eye for editing/deletion
  selectedFeltId: null, // Currently selected felt for editing/deletion
  nextId: 1,
  cursorClient: null, // { x, y } last known cursor on canvas
  eyeScale: 8, // multiplier over yarn radius for eye radius
  selectionRadiusPx: 56, // pixel radius for hover/selection leniency
  showOrbitProxy: false, // debug render for orbital proxy sphere/mesh
  showSourceObject: false, // show the base object used to derive nodes
  showDebugRaycastMesh: true, // show the semi-transparent green raycast target mesh for debugging
  showFeltVertices: false, // show debug vertex markers on felt pieces
  yarnOrbitalDistance: 0.15, // distance yarn orbits from object surface
  curvatureCompensation: 0.7, // how much to reduce orbital distance at high-curvature areas (0=no reduction, 1=full reduction)
  usedPoints: new Set(), // grid point ids already decorated

  // Layers visibility and naming
  hiddenItems: new Set(), // keys like 'eye:1', 'yarn:3', 'felt:2'
  itemNames: new Map(), // custom names: 'eye:1' -> 'Left Eye', 'yarn:3' -> 'Smile'

  isItemHidden: (type, id) => {
    const key = `${type}:${id}`
    return get().hiddenItems.has(key)
  },
  setItemVisible: (type, id, visible) => set((s) => {
    const key = `${type}:${id}`
    const hidden = new Set(s.hiddenItems)
    if (visible) hidden.delete(key); else hidden.add(key)
    return { hiddenItems: hidden }
  }),
  toggleItemVisibility: (type, id) => set((s) => {
    const key = `${type}:${id}`
    const hidden = new Set(s.hiddenItems)
    if (hidden.has(key)) hidden.delete(key); else hidden.add(key)
    return { hiddenItems: hidden }
  }),
  setTypeVisible: (type, visible) => set((s) => {
    const hidden = new Set(s.hiddenItems)
    const items = type === 'eye' ? s.eyes : type === 'yarn' ? s.yarns : s.feltPieces
    for (const it of items) {
      const key = `${type}:${it.id}`
      if (visible) hidden.delete(key); else hidden.add(key)
    }
    return { hiddenItems: hidden }
  }),
  getItemName: (type, id) => {
    const key = `${type}:${id}`
    const customName = get().itemNames.get(key)
    if (customName) return customName
    // Default names
    if (type === 'eye') return `Eye ${id}`
    if (type === 'yarn') return `Yarn ${id}`
    if (type === 'felt') return `Felt ${id}`
    return `${type} ${id}`
  },
  setItemName: (type, id, name) => set((s) => {
    const key = `${type}:${id}`
    const newNames = new Map(s.itemNames)
    if (name && name.trim()) {
      newNames.set(key, name.trim())
    } else {
      newNames.delete(key) // Remove custom name, fall back to default
    }
    return { itemNames: newNames }
  }),

  setTool: (tool) => set({ tool }),
  toggleGridPoints: () => set((s) => ({ showGridPoints: !s.showGridPoints })),
  toggleGridVectors: () => set((s) => ({ showGridVectors: !s.showGridVectors })),
  toggleOnlyNearGridPoints: () => set((s) => ({ showOnlyNearGridPoints: !s.showOnlyNearGridPoints })),
  toggleShowAllGridPoints: () => set((s) => ({ showAllGridPoints: !s.showAllGridPoints })),
  toggleAlwaysShowAllNodes: () => set((s) => ({ alwaysShowAllNodes: !s.alwaysShowAllNodes })),
  setGridYawStartDeg: (v) => set({ gridYawStartDeg: Math.max(-360, Math.min(360, Number(v) || 0)) }),
  setGridYawEndDeg: (v) => set({ gridYawEndDeg: Math.max(-360, Math.min(360, Number(v) || 0)) }),
  setGridAngularOffsetDeg: (v) => set({ gridAngularOffsetDeg: Math.max(-180, Math.min(180, Number(v) || 0)) }),
  setCursor: (pt) => set({ cursorClient: pt ? { x: pt.x, y: pt.y } : null }),
  setEyeScale: (v) => set({ eyeScale: Math.max(1, Math.min(40, Number(v) || 8)) }),
  setSelectionRadiusPx: (v) => set({ selectionRadiusPx: Math.max(8, Math.min(150, Number(v) || 56)) }),
  setYarnOrbitalDistance: (v) => set({ yarnOrbitalDistance: Math.max(0.01, Math.min(2.0, Number(v) || 0.15)) }),
  setCurvatureCompensation: (v) => set({ curvatureCompensation: Math.max(0.0, Math.min(1.0, Number(v) || 0.7)) }),
  toggleOrbitProxy: () => set((s) => ({ showOrbitProxy: !s.showOrbitProxy })),
  toggleSourceObject: () => set((s) => ({ showSourceObject: !s.showSourceObject })),
  toggleDebugRaycastMesh: () => set((s) => ({ showDebugRaycastMesh: !s.showDebugRaycastMesh })),
  toggleFeltVertices: () => set((s) => ({ showFeltVertices: !s.showFeltVertices })),

  hasUsedPoint: (pointId) => {
    try { return get().usedPoints.has(pointId) } catch (_) { return false }
  },
  addUsedPoint: (pointId) => set((s) => {
    const next = new Set(s.usedPoints)
    if (pointId != null) next.add(pointId)
    return { usedPoints: next }
  }),
  
  clearUsedPoints: () => set({ usedPoints: new Set() }),

  addEyeAt: ({ pointId = null, position, normal, ringTangent, quaternion, radius }) => {
    const id = get().nextId
    set((s) => ({
      eyes: [...s.eyes, { 
        id, 
        pointId, 
        position: [...position], 
        normal: [...(normal || [0,1,0])], 
        ringTangent: [...(ringTangent || [1,0,0])], 
        quaternion: Array.isArray(quaternion) ? [...quaternion] : undefined,
        radius: Number(radius) || 0.12 
      }],
      nextId: s.nextId + 1
    }))
  },

  removeEye: (id) => set((s) => ({ eyes: s.eyes.filter(e => e.id !== id) })),

  startOrFinishYarnAt: ({ pointId = null, position, radius, sourceObject = null }) => {
    const start = get().pendingYarnStart
    const startId = get().pendingYarnStartId
    const startSourceObject = get().pendingYarnStartSourceObject
    if (!start) {
      set({ 
        pendingYarnStart: [...position], 
        pendingYarnStartId: pointId,
        pendingYarnStartSourceObject: sourceObject
      })
      return { status: 'started' }
    }
    const id = get().nextId
    // Use the source object from the start point if available, otherwise use the end point's
    const yarnSourceObject = startSourceObject || sourceObject
    set((s) => ({
      yarns: [...s.yarns, { 
        id, 
        start: [...start], 
        end: [...position], 
        radius: Number(radius) || 0.06, 
        startPointId: startId, 
        endPointId: pointId, 
        curvature: 0.0,
        sourceObject: yarnSourceObject,
        color: generateYarnColor(id)
      }],
      nextId: s.nextId + 1,
      pendingYarnStart: null,
      pendingYarnStartId: null,
      pendingYarnStartSourceObject: null
    }))
    return { status: 'completed', startPointId: startId, endPointId: pointId }
  },

  cancelYarn: () => set({ pendingYarnStart: null, pendingYarnStartId: null, pendingYarnStartSourceObject: null }),

  removeYarn: (id) => set((s) => ({ 
    yarns: s.yarns.filter(y => y.id !== id),
    selectedYarnId: s.selectedYarnId === id ? null : s.selectedYarnId
  })),

  selectYarn: (id) => set({ selectedYarnId: id }),
  clearYarnSelection: () => set({ selectedYarnId: null }),
  selectEye: (id) => set({ selectedEyeId: id }),
  clearEyeSelection: () => set({ selectedEyeId: null }),
  selectFelt: (id) => set({ selectedFeltId: id }),
  clearFeltSelection: () => set({ selectedFeltId: null }),
  selectItem: (type, id) => {
    if (type === 'eye') set({ selectedEyeId: id, selectedYarnId: null, selectedFeltId: null })
    else if (type === 'yarn') set({ selectedYarnId: id, selectedEyeId: null, selectedFeltId: null })
    else if (type === 'felt') set({ selectedFeltId: id, selectedEyeId: null, selectedYarnId: null })
  },
  clearAllSelections: () => set({ selectedYarnId: null, selectedEyeId: null, selectedFeltId: null }),

  updateYarnCurvature: (id, curvature) => set((state) => ({
    yarns: state.yarns.map(y => y.id === id ? { ...y, curvature } : y)
  })),

  updateYarnColor: (id, color) => set((state) => ({
    yarns: state.yarns.map(y => y.id === id ? { ...y, color } : y)
  })),

  updateEyeRadius: (id, radius) => set((state) => ({
    eyes: state.eyes.map(e => e.id === id ? { ...e, radius: Math.max(0.4, Math.min(0.8, Number(radius) || 0.4)) } : e)
  })),

  // Felt paper actions
  openFeltModal: () => set({ showFeltModal: true }),
  closeFeltModal: () => set({ showFeltModal: false }),
  setFeltColor: (color) => set({ feltColor: color }),
  setFeltScale: (scale) => set({ feltScale: Math.max(0.1, Math.min(10.0, Number(scale) || 1.0)) }),
  setFeltRotation: (rotation) => set({ feltRotation: Number(rotation) || 0 }),
  setSelectedFeltShape: (shapeKey, shapeData) => set({
    selectedFeltShape: shapeKey,
    selectedFeltShapeData: shapeData
  }),
  openCustomShapeEditor: () => set({ showCustomShapeEditor: true }),
  closeCustomShapeEditor: () => set({ showCustomShapeEditor: false }),
  addCustomShape: (shape) => set((s) => ({
    customShapes: [...s.customShapes, shape]
  })),
  setFeltSurfaceHover: (hoverState) => set({ feltSurfaceHover: hoverState }),

  addFeltPiece: ({ shape, color, position, normal, scale = 1.0, rotation = 0 }) => {
    const id = get().nextId
    const finalScale = scale || get().feltScale
    const finalRotation = rotation !== undefined ? rotation : get().feltRotation
    set((s) => ({
      feltPieces: [...s.feltPieces, {
        id,
        shape,
        color,
        position: [...position],
        normal: [...normal],
        scale: finalScale,
        rotation: finalRotation
      }],
      nextId: s.nextId + 1
    }))
    return { status: 'completed', id }
  },

  updateFeltPiece: (id, updates) => set((s) => ({
    feltPieces: s.feltPieces.map(f =>
      f.id === id ? { ...f, ...updates } : f
    )
  })),

  removeFeltPiece: (id) => set((s) => ({
    feltPieces: s.feltPieces.filter(f => f.id !== id)
  })),

  clearAll: () => set({ eyes: [], yarns: [], feltPieces: [], pendingYarnStart: null, selectedYarnId: null, usedPoints: new Set() }),

  yarnRadiusFromLevel,
}))


