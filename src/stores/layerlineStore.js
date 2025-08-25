import { create } from 'zustand'
import { generateLayerLines } from '../layerlines/pipeline'

export const useLayerlineStore = create((set, get) => ({
  settings: {
    // Crocheter-friendly inputs
    yarnSizeLevel: 4, // 1..9 (4 is normal)
    magicRingDefaultStitches: 6,
    tightenFactor: 1.0,
    increaseFactor: 1.0, // scales increases derived from circumference ratio
    decreaseFactor: 1.0, // scales decreases when circumference shrinks
    planSpacingMode: 'even', // 'even' | 'jagged'
    showFullScaffold: false,

    // Advanced/legacy (still supported by generators if provided)
    layerHeight: 0.2,
    pattern: 'concentric',
    lineSpacing: 0.5,
    color: '#00ffaa',
    maxLayers: 500,
    previewLayers: 100000,
    stitchSize: 0.5,
    crochetSpacing: true,
    clipAgainstObjects: true,
    // Optional: show extra helper paths (edge arcs/connectors) near intersections
    intersectionHelpers: false,
    spacingMode: 'world', // 'world' | 'surface'
    // Preview/Performance
    lodEnabled: true,
    lodPixelThreshold: 2.5, // pixels between adjacent layers on screen
    previewMode: 'lines', // 'lines' | 'shader'
    useWorker: false,
    renderMaxLayers: 400, // view-only cap; export still uses full data
    showMeasurements: false,
    measureEvery: 1,
    // Oval detection
    ovalThreshold: 0.75,
    chainThreshold: 1.6,
    // Fragment filtering
    minFragmentRatio: 0.2, // Minimum perimeter ratio for layer fragments (0.0 to 1.0)
  },
  generated: {
    layers: [],
    stats: { layerCount: 0, totalLineCount: 0 },
    bbox: { min: [-5, 0, -5], max: [5, 10, 5] },
    markers: { poles: [], ring0: null },
  },
  isGenerating: false,
  lastGeneratedAt: null,

  setSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
  clear: () => set({ generated: { layers: [], stats: { layerCount: 0, totalLineCount: 0 }, bbox: { min: [0,0,0], max: [0,0,0] }, markers: { poles: [], ring0: null } } }),

  generate: async (objects) => {
    const { settings } = get()
    set({ isGenerating: true })
    try {
      // Yield to the browser so the UI can update before heavy work starts
      await new Promise((resolve) => requestAnimationFrame(() => resolve()))
      const result = generateLayerLines(objects, settings)
      set({ generated: result, lastGeneratedAt: Date.now() })
    } finally {
      set({ isGenerating: false })
    }
  },

  exportJSON: () => {
    const { generated, settings } = get()
    const payload = JSON.stringify({ settings, generated }, null, 2)
    return payload
  },
}))
