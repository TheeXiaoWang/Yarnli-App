import { create } from 'zustand'
import { createHistoryHelpers } from './history'

// Color assignment for different primitive types
const getColorForType = (type) => {
  const colorMap = {
    sphere: '#ff6b6b',    // Red
    cone: '#4ecdc4',      // Teal
    cylinder: '#45b7d1',  // Blue
    capsule: '#96ceb4',   // Green
    pyramid: '#feca57',   // Yellow
    torus: '#ff9ff3'      // Pink
  }
  return colorMap[type] || '#4ecdc4' // Default to teal
}

const useSceneStore = create((set, get) => ({
  // Scene state
  objects: [],
  selectedObject: null,
  nextId: 1,

  // History
  ...createHistoryHelpers(set, get),

  // Add a new object to the scene
  addObject: (type, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    get()._pushHistory()
    const id = get().nextId
    const newObject = {
      id,
      type,
      position: [...position],
      scale: [...scale],
      rotation: [...rotation],
      color: getColorForType(type),
      visible: true
    }

    set(state => ({
      objects: [...state.objects, newObject],
      nextId: state.nextId + 1,
      selectedObject: newObject
    }))
  },

  // Remove an object from the scene
  removeObject: (id) => {
    get()._pushHistory()
    set(state => ({
      objects: state.objects.filter(obj => obj.id !== id),
      selectedObject: state.selectedObject?.id === id ? null : state.selectedObject
    }))
  },

  // Select an object (no history)
  selectObject: (id) => {
    set({ selectedObject: get().objects.find(obj => obj.id === id) || null })
  },

  // Update object properties
  updateObject: (id, updates) => {
    get()._pushHistory()
    set(state => ({
      objects: state.objects.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      ),
      selectedObject: state.selectedObject?.id === id 
        ? { ...state.selectedObject, ...updates }
        : state.selectedObject
    }))
  },

  // Update object position
  updateObjectPosition: (id, position) => {
    get().updateObject(id, { position: [...position] })
  },

  // Update object scale
  updateObjectScale: (id, scale) => {
    get().updateObject(id, { scale: [...scale] })
  },

  // Update object rotation
  updateObjectRotation: (id, rotation) => {
    get().updateObject(id, { rotation: [...rotation] })
  },

  // Priority override controls intersection strength:
  // 'auto' (default): use mass-based ranking; 'strong': always strongest; 'weak': always weakest
  setPriorityOverride: (id, mode = 'auto') => {
    const valid = mode === 'auto' || mode === 'strong' || mode === 'weak'
    if (!valid) return
    get().updateObject(id, { priorityOverride: mode })
  },

  // Duplicate selected object (copy)
  copySelected: () => {
    const sel = get().selectedObject
    if (!sel) return
    get()._pushHistory()
    const id = get().nextId
    const clone = {
      ...sel,
      id,
      position: [sel.position[0] + 0.5, sel.position[1], sel.position[2] + 0.5],
    }
    set(state => ({
      objects: [...state.objects, clone],
      nextId: state.nextId + 1,
      selectedObject: clone,
    }))
  },

  // Mirror selected object across a plane: axis in {'x','y','z'}, planePosition in world coords
  mirrorSelected: (axis = 'x', planePosition = 0) => {
    const sel = get().selectedObject
    if (!sel) return
    get()._pushHistory()
    const id = get().nextId
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    const pos = [...sel.position]
    // reflect position across the plane: p' = p + 2*(d - n·p)*n with axis-aligned normal
    const d = planePosition
    const delta = d - pos[idx]
    pos[idx] = pos[idx] + 2 * delta

    // mirror scale sign on that axis
    const scale = [...sel.scale]
    scale[idx] = -scale[idx]

    // mirror rotation by flipping the corresponding Euler component
    const rotation = [...sel.rotation]
    rotation[idx] = -rotation[idx]

    const clone = { ...sel, id, position: pos, scale, rotation }
    set(state => ({
      objects: [...state.objects, clone],
      nextId: state.nextId + 1,
      selectedObject: clone,
    }))
  },

  // Clear all objects
  clearScene: () => {
    get()._pushHistory()
    set({ objects: [], selectedObject: null, nextId: 1 })
  },

  // Toggle object visibility
  toggleObjectVisibility: (id) => {
    const obj = get().objects.find(o => o.id === id)
    if (obj) {
      get().updateObject(id, { visible: !obj.visible })
    }
  },

  // Toggle visibility for all objects at once
  toggleAllVisibility: () => {
    const anyVisible = get().objects.some(o => o.visible)
    get()._pushHistory()
    set(state => ({
      objects: state.objects.map(o => ({ ...o, visible: !anyVisible })),
      selectedObject: state.selectedObject && !anyVisible ? state.selectedObject : state.selectedObject
    }))
  },

  // Get object by ID
  getObject: (id) => {
    return get().objects.find(obj => obj.id === id)
  },

  // Get all visible objects
  getVisibleObjects: () => {
    return get().objects.filter(obj => obj.visible)
  }
}))

export { useSceneStore }
