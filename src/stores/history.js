// Centralized undo/redo helpers for the scene store
// Captures full object transforms: position, rotation, scale

export function createHistoryHelpers(set, get) {
  const deepCloneState = (state) => ({
    objects: (state.objects || []).map((o) => ({
      ...o,
      position: [...o.position],
      scale: [...o.scale],
      rotation: [...o.rotation],
    })),
    selectedObjectId: state.selectedObject?.id ?? null,
    nextId: state.nextId,
  })

  const applySnapshot = (snap) => {
    const { objects, selectedObjectId, nextId } = snap
    set({
      objects: objects.map((o) => ({
        ...o,
        position: [...o.position],
        scale: [...o.scale],
        rotation: [...o.rotation],
      })),
      selectedObject: objects.find((o) => o.id === selectedObjectId) || null,
      nextId,
    })
  }

  return {
    _undoStack: [],
    _redoStack: [],
    _pushHistory: () => {
      const snapshot = deepCloneState(get())
      set((state) => ({ _undoStack: [...state._undoStack, snapshot], _redoStack: [] }))
    },
    _applySnapshot: applySnapshot,
    undo: () => {
      const stack = get()._undoStack
      if (stack.length === 0) return
      const current = deepCloneState(get())
      const prev = stack[stack.length - 1]
      set((state) => ({ _undoStack: state._undoStack.slice(0, -1), _redoStack: [...state._redoStack, current] }))
      applySnapshot(prev)
    },
    redo: () => {
      const stack = get()._redoStack
      if (stack.length === 0) return
      const current = deepCloneState(get())
      const next = stack[stack.length - 1]
      set((state) => ({ _redoStack: state._redoStack.slice(0, -1), _undoStack: [...state._undoStack, current] }))
      applySnapshot(next)
    },
  }
}

// Optional transactional helpers if needed later
export function beginHistoryTransaction() {
  // no-op placeholder for future batching
}
export function endHistoryTransaction() {
  // no-op placeholder for future batching
}


