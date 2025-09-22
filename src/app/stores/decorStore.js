import { create } from 'zustand'

// Simple mapping from yarn size level (1-8) to tube radius in scene units
function yarnRadiusFromLevel(level) {
  const n = Math.max(1, Math.min(8, Number(level) || 4))
  return 0.03 + (n - 1) * 0.0075
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
  yarns: [], // { id, start:[x,y,z], end:[x,y,z], radius }
  feltPieces: [], // { id, shape: [{x,y}], color, position:[x,y,z], normal:[x,y,z], scale }
  showFeltModal: false,
  feltColor: '#ff6b6b', // Default felt color
  pendingYarnStart: null, // [x,y,z] | null
  pendingYarnStartId: null,
  selectedYarnId: null, // Currently selected yarn for editing/deletion
  nextId: 1,
  cursorClient: null, // { x, y } last known cursor on canvas
  eyeScale: 8, // multiplier over yarn radius for eye radius
  selectionRadiusPx: 56, // pixel radius for hover/selection leniency
  showOrbitProxy: false, // debug render for orbital proxy sphere/mesh
  showSourceObject: false, // show the base object used to derive nodes
  yarnOrbitalDistance: 0.15, // distance yarn orbits from object surface
  curvatureCompensation: 0.7, // how much to reduce orbital distance at high-curvature areas (0=no reduction, 1=full reduction)
  usedPoints: new Set(), // grid point ids already decorated

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

  startOrFinishYarnAt: ({ pointId = null, position, radius }) => {
    const start = get().pendingYarnStart
    const startId = get().pendingYarnStartId
    if (!start) {
      set({ pendingYarnStart: [...position], pendingYarnStartId: pointId })
      return { status: 'started' }
    }
    const id = get().nextId
    set((s) => ({
      yarns: [...s.yarns, { id, start: [...start], end: [...position], radius: Number(radius) || 0.06, startPointId: startId, endPointId: pointId, curvature: 0.0 }],
      nextId: s.nextId + 1,
      pendingYarnStart: null,
      pendingYarnStartId: null
    }))
    return { status: 'completed', startPointId: startId, endPointId: pointId }
  },

  cancelYarn: () => set({ pendingYarnStart: null }),

  removeYarn: (id) => set((s) => ({ 
    yarns: s.yarns.filter(y => y.id !== id),
    selectedYarnId: s.selectedYarnId === id ? null : s.selectedYarnId
  })),

  selectYarn: (id) => set({ selectedYarnId: id }),
  
  clearYarnSelection: () => set({ selectedYarnId: null }),

  updateYarnCurvature: (id, curvature) => set((state) => ({
    yarns: state.yarns.map(y => y.id === id ? { ...y, curvature } : y)
  })),

  // Felt paper actions
  openFeltModal: () => set({ showFeltModal: true }),
  closeFeltModal: () => set({ showFeltModal: false }),
  setFeltColor: (color) => set({ feltColor: color }),
  
  addFeltPiece: ({ shape, color, position, normal, scale = 1.0 }) => {
    const id = get().nextId
    set((s) => ({
      feltPieces: [...s.feltPieces, { id, shape, color, position: [...position], normal: [...normal], scale }],
      nextId: s.nextId + 1
    }))
    return { status: 'completed', id }
  },

  removeFeltPiece: (id) => set((s) => ({ 
    feltPieces: s.feltPieces.filter(f => f.id !== id)
  })),

  clearAll: () => set({ eyes: [], yarns: [], feltPieces: [], pendingYarnStart: null, selectedYarnId: null, usedPoints: new Set() }),

  yarnRadiusFromLevel,
}))


