import { create } from 'zustand'
import * as THREE from 'three'
import { computeStitchDimensions } from '../layerlines/stitches'
import { computeMagicRingCount } from '../nodes/magicRing'
import { computeMagicRingNodes } from '../nodes/magicRingNodes'
import { computeOvalChainScaffold } from '../nodes/ovalChainScaffold'
import { detectOvalStart } from '../layerlines/pipeline/index.js'

function deriveStartAndNormal(markers) {
  let start = null
  let end = null
  const poles = markers?.poles || []
  for (const entry of poles) {
    if (Array.isArray(entry)) {
      if (!start) start = new THREE.Vector3(entry[0], entry[1], entry[2])
      else if (!end) end = new THREE.Vector3(entry[0], entry[1], entry[2])
    } else if (entry && entry.p) {
      const v = new THREE.Vector3(entry.p[0], entry.p[1], entry.p[2])
      if (entry.role === 'start') start = v
      else if (entry.role === 'end') end = v
      else if (!start) start = v
      else if (!end) end = v
    }
  }
  if (!start) start = new THREE.Vector3(0, 0, 0)
  let normal = new THREE.Vector3(0, 1, 0)
  if (end) {
    normal = new THREE.Vector3().subVectors(end, start)
    if (normal.lengthSq() < 1e-12) normal.set(0, 1, 0)
    normal.normalize()
  }
  return { startCenter: start, ringPlaneNormal: normal }
}

function estimateR0FromRing0(markers, center) {
  const ring0 = markers?.ring0
  const poly = Array.isArray(ring0) && ring0.length > 0 ? ring0[0] : null
  if (!poly || poly.length === 0) return null
  const c = center
  let sum = 0
  let count = 0
  for (const p of poly) {
    if (!Array.isArray(p) || p.length < 3) continue
    const v = new THREE.Vector3(p[0], p[1], p[2])
    sum += v.distanceTo(c)
    count++
  }
  if (count === 0) return null
  return sum / count
}

function pickRingClosestToPoint(layers, point) {
  if (!Array.isArray(layers) || layers.length === 0 || !point) return null
  let best = null
  let bestD = Infinity
  for (const l of layers) {
    const poly = l?.polylines?.[0]
    if (!poly || poly.length === 0) continue
    const mid = poly[Math.floor(poly.length / 2)]
    const v = new THREE.Vector3(mid[0], mid[1], mid[2])
    const d = v.distanceTo(point)
    if (d < bestD) { bestD = d; best = { poly, layer: l } }
  }
  return best
}

function pickNextRingByDistance(layers, point, firstPoly) {
  if (!Array.isArray(layers) || layers.length === 0 || !point) return null
  const entries = []
  for (const l of layers) {
    const poly = l?.polylines?.[0]
    if (!poly || poly.length === 0) continue
    const mid = poly[Math.floor(poly.length / 2)]
    const v = new THREE.Vector3(mid[0], mid[1], mid[2])
    const d = v.distanceTo(point)
    entries.push({ d, poly, layer: l })
  }
  entries.sort((a, b) => a.d - b.d)
  if (entries.length < 2) return null
  // First is closest; we want the next outward different poly
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.poly !== firstPoly) return e
  }
  return entries[1] || null
}

export const useNodeStore = create((set, get) => ({
  nodes: null,
  scaffold: null,
  isGenerating: false,
  lastGeneratedAt: null,
  ui: {
    showNodes: true,
    showScaffold: true,
  },

  clear: () => set({ nodes: null, scaffold: null, lastGeneratedAt: null }),

  setVisibility: (partial) => set((state) => ({ ui: { ...state.ui, ...partial } })),

  // Generates MR nodes using current layerline output as guidance inputs
  generateNodesFromLayerlines: async ({ generated, settings, handedness = 'right', tightenFactor = 0.8 }) => {
    if (!generated || !generated.layers || generated.layers.length === 0) return
    set({ isGenerating: true })
    try {
      // Plane inputs
      const { startCenter, ringPlaneNormal } = deriveStartAndNormal(generated.markers)

      // r0 estimate from ring0; fallback epsilon handled in MR-Count
      const r0Est = estimateR0FromRing0(generated.markers, startCenter)
      const y0 = generated.layers[0]?.y ?? 0
      const layerYs = [y0]
      const getRadiusAtY = () => (r0Est ?? 0)

      // Stitch gauge from yarn size level
      const { width } = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4, baseWidth: 1 })
      const stitchGauge = { width: width || settings?.stitchSize || 0.5 }

      // Module 1: count
      const mrCountResult = computeMagicRingCount({
        layerYs,
        getRadiusAtY,
        startCenter,
        ringPlaneNormal,
        stitchGauge,
        factors: { inc: 1.7, dec: 0.6 },
        handedness,
      })

      // Module 2: nodes – detect oval start using layer pipeline helper
      const oval = detectOvalStart({ layers: generated.layers, startCenter, ringPlaneNormal, stitchGauge })
      const firstRing = oval?.firstRing || null
      const nextRing = oval?.nextRing || null
      let nodesResult = null
      if (oval?.isOval && firstRing && nextRing) {
        nodesResult = computeOvalChainScaffold({ firstRing, nextRing, startCenter, ringPlaneNormal, stitchGauge, handedness })
      }
      if (!nodesResult) {
        nodesResult = computeMagicRingNodes({
          mrCountResult,
          stitchGauge,
          startCenter,
          ringPlaneNormal,
          handedness,
          tightenFactor,
          firstRing,
          nextRing,
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

      set({ nodes: nodesResult?.nodeRing0 || null, scaffold: nodesResult?.scaffold || null, lastGeneratedAt: Date.now() })
    } finally {
      set({ isGenerating: false })
    }
  },
}))


