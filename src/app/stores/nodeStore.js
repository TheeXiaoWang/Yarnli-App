import { create } from 'zustand'
import * as THREE from 'three'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
// TODO: Restore initial/ directory - temporarily commented out during restructuring
// import { magicRing, firstLayerPlanner } from '../../domain/nodes/initial'
// TODO: Restore ovalChainScaffold.js - temporarily commented out during restructuring
// import { computeOvalChainScaffold } from '../../domain/nodes/ovalChainScaffold'
import { planScaffoldChain, planScaffoldByObject } from '../../services/scaffoldPlanning'
import { distributeNextNodes, countNextStitches } from '../../domain/nodes/transitions'
import { useLayerlineStore } from './layerlineStore'
import { detectOvalStart } from '../../domain/layerlines/pipeline/index.js'
import { computeStitchGaugeFromSettings } from '../../services/stitches/computeGauge'
import { STITCH_TYPES } from '../../constants/stitchTypes'
import { intersectWithPlane, nearestPointOnPolyline } from '../../ui/editor/measurements/utils'
// TODO: Restore scaffold.js - temporarily commented out during restructuring
// Removed: buildScaffoldSegmentsToLayer, snapOnLayerByTheta, monotonicBuckets, enforceStepContinuity, filterInterLayerOnly
import { estimateR0FromRing0, averageRadiusFromPolyline, sampleRadiusAtY, normalizeAngle, computeOrderedAngles, angleSpan, alignRingByAzimuth } from '../../domain/nodes/utils'
import { findLayerBelow, findLayerAtLeastBelow, findImmediateLayerBelow, pickRingClosestToPoint, pickNextRingByDistance, getFirstLayerRing, deriveStartAndNormal } from '../../domain/layerlines/layerUtils'
import { computeTargetSpacing } from '../../services/nodePlanning/dynamicSpacing'

export const useNodeStore = create((set, get) => ({
  nodes: null,
  scaffold: null,
  nextNodes: null,
  nextScaffold: null,
  nextPoints: null,
  nextLayersPoints: [],
  spacingPerLayer: [],
  transitionOps: [],
  chainScaffold: [],
  chainScaffoldByLayer: [],
  stitchCounts: [],
  scaffoldCenter: null,
  nodeChildPath: [],
  isGenerating: false,
  lastGeneratedAt: null,
  ui: {
    showNodes: true,
    showScaffold: true,
    showNodePoints: false,
    showAxesHelper: false,
    showSpacing: false,
    showIncDec: false,
    showNodeIndices: false,
    visibleLayerCount: 999,
    nodePathIndex: -1, // legacy: path filtering (not used by new sliders)
    nodeLayerVisibleCount: 0, // how many node layers to show (cyan rings)
    nodeVisibleCount: 1, // how many nodes to show on the last visible node layer (min 1)
  },

  clear: () => set({ nodes: null, scaffold: null, nextNodes: null, nextScaffold: null, nextPoints: null, nextLayersPoints: [], spacingPerLayer: [], transitionOps: [], chainScaffold: [], chainScaffoldByLayer: [], stitchCounts: [], scaffoldCenter: null, nodeChildPath: [], lastGeneratedAt: null }),

  setVisibility: (partial) => set((state) => ({ ui: { ...state.ui, ...partial } })),

  // Generates MR nodes using current layerline output as guidance inputs
  generateNodesFromLayerlines: async ({ generated, settings, handedness = 'right' }) => {
    // TODO: Restore node generation - temporarily disabled during restructuring
    // Missing dependencies: magicRing, firstLayerPlanner, computeOvalChainScaffold, scaffold utilities
    console.warn('[NodeStore] Node generation temporarily disabled - missing dependencies during restructuring')
    set({ isGenerating: false })
    return

    /* TEMPORARILY DISABLED - Restore when dependencies are available
    if (!generated || !generated.layers || generated.layers.length === 0) return
    set({ isGenerating: true })
    try {
      // Cache markers globally so planners can react to pole intersections
      try { if (typeof window !== 'undefined') window.__LAYERLINE_MARKERS__ = generated?.markers || {} } catch (_) {}

      // Plane inputs
      const { startCenter, endCenter, ringPlaneNormal } = deriveStartAndNormal(generated.markers)

      // Get the first layer ring for accurate scaffolding
      const firstLayerRing = getFirstLayerRing(generated.layers, startCenter)

      // r0 estimate from ring0; fallback epsilon handled in MR-Count
      const r0Est = estimateR0FromRing0(generated.markers, startCenter)
      const y0 = generated.layers[0]?.y ?? 0
      const layerYs = [y0]
      const getRadiusAtY = () => (r0Est ?? 0)

      // Stitch gauge from yarn size level
      const { width } = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4, baseWidth: 1 })
      const stitchGauge = { width: width || settings?.stitchSize || 0.5 }

      // Get stitch type for proper sizing
      const stitchType = settings?.magicRingStitchType || 'mr'
      const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.mr || STITCH_TYPES.sc
      
      // Calculate actual stitch width based on stitch type and yarn size
      const baseDims = computeStitchDimensions({ 
        sizeLevel: settings?.yarnSizeLevel ?? 4, 
        baseWidth: 1, 
        baseHeight: 1 
      })
      
      // Ensure stitchProfile exists and has the required properties
      if (!stitchProfile) {
        console.error('Invalid stitch type:', stitchType, 'Available types:', Object.keys(STITCH_TYPES))
        return
      }
      
      const widthMul = stitchProfile.widthMul ?? ((stitchProfile.width ?? 0.5) / 0.5)
      const heightMul = stitchProfile.heightMul ?? ((stitchProfile.height ?? 0.5) / 0.5)
      const actualStitchWidth = baseDims.width * widthMul
      const actualStitchHeight = baseDims.height * heightMul
      
      // Use actual stitch width for gauge instead of generic yarn width
      const stitchGaugeWithType = { width: actualStitchWidth }

      // Use settings from layerline store for better control
      const effectiveHandedness = settings?.handedness || handedness
      const effectiveTightenFactor = 0.9

      // Module 1: count (this may be overridden by planner/settings)
      let mrCountResult = magicRing.computeMagicRingCount({
        layerYs,
        getRadiusAtY,
        startCenter,
        ringPlaneNormal,
        stitchGauge: stitchGaugeWithType, // Use stitch-type-specific gauge
        factors: { inc: 1.7, dec: 0.6 },
        handedness: effectiveHandedness,
      })

      // First-layer planning: choose S0 and anchor from the real first ring when available
      const plan = firstLayerPlanner({
        layers: generated.layers,
        firstRing: firstLayerRing,
        startCenter,
        endCenter,
        ringPlaneNormal,
        stitchGauge: stitchGaugeWithType,
        tightenFactor: effectiveTightenFactor,
      })
      // Allow explicit override via settings; else use planner S0
      const plannedS = Math.max(3, Math.round(Number(plan?.S0) || 0))
      const forcedS = Number.isFinite(settings?.magicRingDefaultStitches)
        ? Math.max(3, Math.round(settings.magicRingDefaultStitches))
        : (plannedS > 0 ? plannedS : 6)

      // Debug logging to trace magic ring stitch count
      console.log('[MagicRing] Stitch count calculation:', {
        'settings.magicRingDefaultStitches': settings?.magicRingDefaultStitches,
        'isFinite': Number.isFinite(settings?.magicRingDefaultStitches),
        'plannedS (from circumference)': plannedS,
        'forcedS (final value)': forcedS,
        'plan.S0': plan?.S0,
      })

      mrCountResult = {
        ...mrCountResult,
        magicRing: {
          ...mrCountResult.magicRing,
          stitchCount: forcedS,
        },
      }

      // Module 2: nodes – detect oval start using layer pipeline helper
      const oval = detectOvalStart({ layers: generated.layers, startCenter, ringPlaneNormal, stitchGauge: stitchGaugeWithType })
      // Always use the closest first layer ring to anchor MR node positions
      const firstRing = firstLayerRing
      const nextRing = oval?.nextRing || null
      let nodesResult = null
      
      if (oval?.isOval && firstRing && nextRing) {
        nodesResult = computeOvalChainScaffold({ firstRing, nextRing, startCenter, ringPlaneNormal, stitchGauge: stitchGaugeWithType, handedness: effectiveHandedness })
      }
      
      if (!nodesResult) {
        nodesResult = magicRing.computeMagicRingNodes({
          mrCountResult,
          stitchGauge: stitchGaugeWithType, // Use stitch-type-specific gauge
          startCenter,
          endCenter,
          ringPlaneNormal,
          handedness: effectiveHandedness,
          tightenFactor: effectiveTightenFactor,
          firstRing, // always project to first layer
          nextRing,
          overrideStitchCount: forcedS,
        })
      }

      // Debug: verify nodes coincide with scaffold endpoints (log individual mismatches and a sample)
      try {
        if (nodesResult?.nodeRing0?.nodes && nodesResult?.scaffold?.segments) {
          const nn = nodesResult.nodeRing0.nodes
          const ss = nodesResult.scaffold.segments
          const mismatches = []
          for (let i = 0; i < Math.min(nn.length, ss.length); i++) {
            const p = nn[i].p
            const end = ss[i][1]
            const dx = p[0] - end[0], dy = p[1] - end[1], dz = p[2] - end[2]
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
            if (dist > 1e-5) {
              mismatches.push({ i, p, end, dist })
              // eslint-disable-next-line no-console
              console.warn('[MR-Nodes] mismatch at', i, 'dist=', dist, 'node=', p, 'scaffoldEnd=', end)
            }
          }
          // eslint-disable-next-line no-console
          console.log('[MR-Nodes] nodes vs scaffold endpoints:', { total: nn.length, checked: Math.min(nn.length, ss.length), mismatches })
          if (nn.length > 0 && ss.length > 0) {
            // eslint-disable-next-line no-console
            console.log('[MR-Nodes] sample node vs scaffold:', { node: nn[0].p, end: ss[0][1] })
          }
        }
      } catch (_) {}

      // Do not keep a Magic-Ring first ring; planner will generate from Layer0 upward
      set({ nodes: null, scaffold: { segments: [] }, chainScaffold: [], stitchCounts: [], scaffoldCenter: [startCenter.x, startCenter.y, startCenter.z], lastGeneratedAt: Date.now() })

      // Auto-generate visual scaffold lines across all subsequent layers using circumference-based increases
      try {
        const metaCenterArr = nodesResult?.nodeRing0?.meta?.center || [startCenter.x, startCenter.y, startCenter.z]
        const centerV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
        // Build slice axis from poles to make node gen orientation-agnostic
        let axisDir = new THREE.Vector3(0,1,0)
        let axisOrigin = centerV.clone()
        try {
          const poles = (generated?.markers?.poles || []).map(e => Array.isArray(e) ? { p: e } : e)
          const startP = poles.find(e => e?.role === 'start')?.p || poles[0]?.p
          const endP = poles.find(e => e?.role === 'end')?.p || poles[1]?.p
          if (startP && endP) {
            axisDir = new THREE.Vector3(endP[0]-startP[0], endP[1]-startP[1], endP[2]-startP[2])
            if (axisDir.lengthSq() > 1e-12) axisDir.normalize()
            else axisDir.set(0,1,0)
            axisOrigin = new THREE.Vector3(startP[0], startP[1], startP[2])
          }
        } catch (_) {}
        const startKey = axisDir.dot(centerV.clone().sub(axisOrigin))
        const increaseFactor = Number.isFinite(settings?.increaseFactor) ? settings.increaseFactor : 1.0
        const decreaseFactor = Number.isFinite(settings?.decreaseFactor) ? settings.decreaseFactor : 1.0
        const spacingMode = settings?.planSpacingMode || 'even'
        const incMode = settings?.planIncreaseMode || spacingMode
        const decMode = settings?.planDecreaseMode || spacingMode

        // NEW: Use dynamic spacing logic that maintains edge-to-edge gaps
        // This automatically compensates for changes in widthMul
        const spacingResult = computeTargetSpacing({
          yarnSizeLevel: settings?.yarnSizeLevel ?? 4,
          stitchType: stitchType,
          tightenFactor: effectiveTightenFactor,
        })
        const targetSpacing = Math.max(1e-6, spacingResult.centerSpacing)

        // Use centralized scaffold pipeline path below

        // Use shared per-object ordering inside planScaffoldByObject; do not pre-filter here
        const layersToProcess = generated.layers || []

        // Initialize with FIRST LAYER nodes (endpoints of MR scaffold) to avoid duplicating MR->Layer0 step
        // Start from a single start-pole anchor; transition planner will create Layer0 ring
        const initialRing = [ { p: [startCenter.x, startCenter.y, startCenter.z] } ]
        const layersToPlan = Array.isArray(layersToProcess) ? layersToProcess : []
        const globalSettings = useLayerlineStore.getState()?.settings || {}
        try { if (typeof window !== 'undefined') window.__LAYERLINE_SETTINGS__ = globalSettings } catch (_) {}
        // Prefer the latest global setting first, then local override, then default
        const planner = planScaffoldChain
        // eslint-disable-next-line no-console
        console.log('[ScaffoldPlanner]', 'V1')
        // Plan per object and flatten for current UI
        const { chainSegments, chainByLayer, childMaps, allNextRings, firstNextNodesRing, perObject } = planScaffoldByObject({
          layers: layersToPlan,
          startKey,
          centerV,
          axisDir,
          currentNodes: initialRing,
          markers: generated?.markers,
          distributeNextNodes,
          countNextStitches,
          targetSpacing,
          increaseFactor,
          decreaseFactor,
          incMode,
          decMode,
          spacingMode,
          handedness: effectiveHandedness,
        })
        // Keep all planner rings including the first layer at the start anchor
        const spacingPerLayer = (allNextRings || []).map((entry) => {
          const nodes = entry.nodes
          if (!nodes || nodes.length < 2) return { y: entry.y, spacing: 0, p: metaCenterArr }
          let total = 0
          for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i].p
            const b = nodes[(i + 1) % nodes.length].p
            total += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2])
          }
          return { y: entry.y, spacing: total / nodes.length, p: nodes[0].p, objectId: entry.objectId }
        })
        // Stitch counts start at the first generated ring (Layer0)
        const countsPerLayer = (allNextRings || []).map((e) => ({ y: e.y, count: e.nodes.length, objectId: e.objectId }))
        const transitionOps = []

        // Update immediate next for cyan lines (first step only)
        const firstBatch = chainByLayer?.[0]?.segments || []
        // eslint-disable-next-line no-console
        console.log('[ChainScaffold] segments total:', chainSegments.length, 'byLayer:', chainByLayer.length)
        // Build a labeled, human-readable series; the first map may be from StartPole (1) to Layer0
        const labeled = childMaps.map((e, i) => {
          const label = (i === 0 && e.fromCount === 1)
            ? 'StartPole -> Layer0'
            : `Layer${i} -> Layer${i + 1}`
          return { ...e, label }
        })
        // eslint-disable-next-line no-console
        console.log('[NodeChildPath]', labeled)
        // Include StartPole -> Layer0 as an initial step for UI sliders
        // No pre-created MR scaffold; show planner output only, with an initial StartPole->Layer0 label for UI
        const chainByLayerFiltered = (chainByLayer || [])
        const chainByLayerWithStart = chainByLayerFiltered
        const chainAllWithStart = chainByLayerFiltered.flatMap(e => e.segments || [])
        // Clamp the visible layer index to new bounds so the slider doesn't snap back unexpectedly
        const maxLayerIdx = Math.max(0, (allNextRings?.length || 0) - 1)
        const prevIdx = (get().ui?.nodeLayerVisibleCount ?? 0)
        const clampedIdx = Math.min(prevIdx, maxLayerIdx)

        set({
          nextNodes: null,
          nextPoints: firstNextNodesRing,
          nextLayersPoints: allNextRings,
          spacingPerLayer,
          transitionOps,
          nextScaffold: { segments: firstBatch, meta: { center: metaCenterArr } },
          chainScaffold: chainAllWithStart,
          chainScaffoldByLayer: chainByLayerWithStart,
          stitchCounts: countsPerLayer,
          scaffoldCenter: metaCenterArr,
          nodeChildPath: labeled,
          ui: { ...get().ui, nodeLayerVisibleCount: clampedIdx },
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ChainScaffold] generation failed:', err)
      }
    } finally {
      set({ isGenerating: false })
    }
    */ // END TEMPORARILY DISABLED
  },

  // Generate next-layer scaffold nodes and connector segments from current ring
  // Inputs: { yNext, rNext, Nnext, handedness, snapLayer }
  // If snapLayer is provided, segment endpoints on the next layer are snapped to its polyline
  generateNextLayerScaffold: ({ yNext, rNext, Nnext, handedness = 'right', snapLayer = null }) => {
    const current = get().nodes
    if (!current || !Array.isArray(current.nodes) || current.nodes.length === 0) return
    const center = current?.meta?.center || [0, yNext, 0]
    const up = current?.meta?.normal || [0, 1, 0]
    const { nodes, meta } = computeNextLayerNodes({ yNext, rNext, Nnext, center, up: new THREE.Vector3(...up), handedness })

    // Build scaffolding segments connecting current ring → next ring by NEAREST destination.
    // One line per current node; endpoints snapped to the provided layer if available.
    const segs = []
    const curN = current.nodes.length
    const poly = snapLayer?.polylines?.[0] || null
    for (let j = 0; j < curN; j++) {
      const a = current.nodes[j].p
      let b = null
      if (poly) {
        const hit = nearestPointOnPolyline(snapLayer, new THREE.Vector3(a[0], a[1] - 1e-9, a[2])) // slight bias downward
        if (hit) b = [hit.x, hit.y, hit.z]
      }
      if (!b) {
        // fallback: choose closest next ring node
        let best = 0
        let bestD2 = Infinity
        for (let k = 0; k < nodes.length; k++) {
          const q = nodes[k].p
          const dx = a[0]-q[0], dy = a[1]-q[1], dz = a[2]-q[2]
          const d2 = dx*dx + dy*dy + dz*dz
          if (d2 < bestD2) { bestD2 = d2; best = k }
        }
        b = nodes[best].p
      }
      segs.push([a, b])
    }

    // We only visualize scaffold lines for next layers to avoid confusing extra node blobs
    // eslint-disable-next-line no-console
    console.log('[NextLayerScaffold] yNext=', yNext, 'rNext=', rNext, 'Nnext=', Nnext, 'segments=', segs.length)
    set({ nextNodes: { nodes, meta }, nextScaffold: { segments: segs, meta: { center, normal: up, lineWidth: 3 } } })
  },
}))


