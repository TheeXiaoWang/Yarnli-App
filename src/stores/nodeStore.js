import { create } from 'zustand'
import * as THREE from 'three'
import { computeStitchDimensions } from '../layerlines/stitches'
import { magicRing } from '../nodes/initial'
import { computeOvalChainScaffold } from '../nodes/ovalChainScaffold'
import { countNextStitches, distributeNextNodes, buildScaffoldSegments } from '../nodes/transitions'
import { detectOvalStart } from '../layerlines/pipeline/index.js'
import { STITCH_TYPES } from '../constants/stitchTypes'
import { intersectWithPlane, nearestPointOnPolyline } from '../components/measurements/utils'

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
  return { startCenter: start, endCenter: end, ringPlaneNormal: normal }
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
    const dx = v.x - c.x
    const dz = v.z - c.z
    sum += Math.hypot(dx, dz)
    count++
  }
  if (count === 0) return null
  return sum / count
}

function averageRadiusFromPolyline(poly, center) {
  if (!Array.isArray(poly) || poly.length === 0) return null
  const c = center
  let sum = 0
  let count = 0
  for (const p of poly) {
    if (!Array.isArray(p) || p.length < 3) continue
    const v = new THREE.Vector3(p[0], p[1], p[2])
    const dx = v.x - c.x
    const dz = v.z - c.z
    sum += Math.hypot(dx, dz)
    count++
  }
  if (count === 0) return null
  return sum / count
}

function sampleRadiusAtY(layers, yTarget, center) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let best = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    const dy = Math.abs(y - yTarget)
    if (dy < bestDy) { bestDy = dy; best = l }
  }
  const poly = best?.polylines?.[0]
  return averageRadiusFromPolyline(poly, center)
}

function findLayerBelow(layers, yCurrent) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let best = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    if (y >= yCurrent) continue
    const dy = yCurrent - y
    if (dy < bestDy) { bestDy = dy; best = l }
  }
  return best
}

function findLayerAtLeastBelow(layers, yCurrent, minDeltaY) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  let candidate = null
  let bestDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    if (y > yCurrent - minDeltaY) continue
    const dy = yCurrent - y
    if (dy < bestDy) { bestDy = dy; candidate = l }
  }
  return candidate || findLayerBelow(layers, yCurrent)
}

function findImmediateLayerBelow(layers, yCurrent) {
  if (!Array.isArray(layers) || layers.length === 0) return null
  const eps = 1e-6
  let best = null
  let minDy = Infinity
  for (const l of layers) {
    const y = Number(l?.y)
    if (!Number.isFinite(y)) continue
    const dy = yCurrent - y
    if (dy > eps && dy < minDy) { minDy = dy; best = l }
  }
  return best
}

function buildScaffoldSegmentsToLayer(currentNodes, nextLayer, center, normal) {
  if (!currentNodes || !Array.isArray(currentNodes.nodes) || !nextLayer) return []
  const poly = nextLayer?.polylines?.[0]
  if (!Array.isArray(poly) || poly.length < 2) return []
  const c = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : (center.clone ? center.clone() : new THREE.Vector3(0,0,0))
  const n = Array.isArray(normal) ? new THREE.Vector3(normal[0], normal[1], normal[2]) : (normal.clone ? normal.clone() : new THREE.Vector3(0,1,0))
  const segs = []
  for (const node of currentNodes.nodes) {
    const p = new THREE.Vector3(node.p[0], node.p[1], node.p[2])
    const dir = p.clone().sub(c)
    dir.y = 0 // prefer azimuth direction around the axis
    if (dir.lengthSq() < 1e-12) dir.set(1,0,0)
    dir.normalize()
    const planeNormal = new THREE.Vector3().crossVectors(n, dir).normalize()
    let q = intersectWithPlane(nextLayer, c, planeNormal, dir, null)
    if (!q) {
      q = nearestPointOnPolyline(nextLayer, p) || p
    }
    segs.push([node.p, [q.x, q.y, q.z]])
  }
  return segs
}

function snapOnLayerByTheta(layer, center, up, theta) {
  const C = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const n = (Array.isArray(up) ? new THREE.Vector3(up[0], up[1], up[2]) : up.clone()).normalize()
  // Build azimuth basis u,v
  let u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize()
  const v = new THREE.Vector3().crossVectors(n, u)
  const dir = u.clone().multiplyScalar(Math.cos(theta)).add(v.clone().multiplyScalar(Math.sin(theta))).normalize()
  const planeNormal = new THREE.Vector3().crossVectors(n, dir).normalize()
  const hit = intersectWithPlane(layer, C, planeNormal, dir, null)
  if (hit) return hit
  const approx = nearestPointOnPolyline(layer, C.clone().add(dir))
  return approx || C
}

function monotonicBuckets(curN, nxtN, maxBranchesPerStitch = 1) {
  const buckets = Array.from({ length: curN }, () => [])
  const boundary = []
  for (let j = 0; j <= curN; j++) boundary[j] = Math.round((j * nxtN) / curN)
  for (let j = 0; j < curN; j++) {
    let kStart = boundary[j]
    let kEnd = boundary[j + 1] - 1
    if (kEnd < kStart) continue
    kEnd = Math.min(kStart + maxBranchesPerStitch, kEnd)
    for (let k = kStart; k <= kEnd; k++) buckets[j].push(k)
  }
  return buckets
}

function enforceStepContinuity(prevSegs, currSegs) {
  if (!Array.isArray(prevSegs) || prevSegs.length === 0) return currSegs
  if (!Array.isArray(currSegs) || currSegs.length === 0) return currSegs
  const prevEnds = prevSegs.map((s) => s[1])
  const used = new Array(prevEnds.length).fill(false)
  const adjusted = []
  for (let i = 0; i < currSegs.length; i++) {
    const start = currSegs[i][0]
    let best = -1
    let bestD2 = Infinity
    for (let j = 0; j < prevEnds.length; j++) {
      if (used[j]) continue
      const e = prevEnds[j]
      const dx = start[0] - e[0]
      const dy = start[1] - e[1]
      const dz = start[2] - e[2]
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < bestD2) { bestD2 = d2; best = j }
    }
    if (best >= 0) {
      used[best] = true
      adjusted.push([prevEnds[best], currSegs[i][1]])
    } else {
      adjusted.push(currSegs[i])
    }
  }
  return adjusted
}

function normalizeAngle(a) {
  const twoPi = Math.PI * 2
  while (a < 0) a += twoPi
  while (a >= twoPi) a -= twoPi
  return a
}

function computeOrderedAngles(points, center) {
  const C = Array.isArray(center) ? new THREE.Vector3(center[0], center[1], center[2]) : center.clone()
  const arr = points.map((p, idx) => {
    const v = new THREE.Vector3(p[0]-C.x, 0, p[2]-C.z)
    const theta = Math.atan2(v.z, v.x)
    return { idx, theta: normalizeAngle(theta), p }
  })
  arr.sort((a, b) => a.theta - b.theta)
  return arr
}

function angleSpan(a, b) {
  // positive arc from a to b in [0,2π)
  let d = b - a
  const twoPi = Math.PI * 2
  if (d < 0) d += twoPi
  return d
}

function filterInterLayerOnly(segs, minDeltaY = 1e-4) {
  if (!Array.isArray(segs)) return []
  return segs.filter(([a, b]) => Math.abs(a[1] - b[1]) >= minDeltaY)
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

// Enhanced function to get the first layer ring for Magic Ring scaffolding
function getFirstLayerRing(layers, startCenter) {
  if (!Array.isArray(layers) || layers.length === 0 || !startCenter) return null
  
  // First try to get the closest ring to the start center
  const closestRing = pickRingClosestToPoint(layers, startCenter)
  if (closestRing && closestRing.poly && closestRing.poly.length >= 3) {
    return closestRing.poly
  }
  
  // Fallback: use the first available layer
  for (const layer of layers) {
    const poly = layer?.polylines?.[0]
    if (poly && poly.length >= 3) {
      return poly
    }
  }
  
  return null
}

export const useNodeStore = create((set, get) => ({
  nodes: null,
  scaffold: null,
  nextNodes: null,
  nextScaffold: null,
  chainScaffold: [],
  stitchCounts: [],
  scaffoldCenter: null,
  isGenerating: false,
  lastGeneratedAt: null,
  ui: {
    showNodes: true,
    showScaffold: true,
  },

  clear: () => set({ nodes: null, scaffold: null, nextNodes: null, nextScaffold: null, chainScaffold: [], stitchCounts: [], scaffoldCenter: null, lastGeneratedAt: null }),

  setVisibility: (partial) => set((state) => ({ ui: { ...state.ui, ...partial } })),

  // Generates MR nodes using current layerline output as guidance inputs
  generateNodesFromLayerlines: async ({ generated, settings, handedness = 'right', tightenFactor = 1.0 }) => {
    if (!generated || !generated.layers || generated.layers.length === 0) return
    set({ isGenerating: true })
    try {
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
      const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.mr
      
      // Calculate actual stitch width based on stitch type and yarn size
      const baseDims = computeStitchDimensions({ 
        sizeLevel: settings?.yarnSizeLevel ?? 4, 
        baseWidth: 1, 
        baseHeight: 1 
      })
      const widthMul = stitchProfile.widthMul ?? ((stitchProfile.width ?? 0.5) / 0.5)
      const heightMul = stitchProfile.heightMul ?? ((stitchProfile.height ?? 0.5) / 0.5)
      const actualStitchWidth = baseDims.width * widthMul
      const actualStitchHeight = baseDims.height * heightMul
      
      // Use actual stitch width for gauge instead of generic yarn width
      const stitchGaugeWithType = { width: actualStitchWidth }

      // Use settings from layerline store for better control
      const effectiveHandedness = settings?.handedness || handedness
      const effectiveTightenFactor = Number.isFinite(settings?.tightenFactor) ? settings.tightenFactor : tightenFactor

      // Module 1: count (this may be overridden by settings for a clean circular MR)
      let mrCountResult = magicRing.computeMagicRingCount({
        layerYs,
        getRadiusAtY,
        startCenter,
        ringPlaneNormal,
        stitchGauge: stitchGaugeWithType, // Use stitch-type-specific gauge
        factors: { inc: 1.7, dec: 0.6 },
        handedness: effectiveHandedness,
      })

      // If we're not in an oval start case, clamp to a sane default count for a magic ring
      const defaultS = Number.isFinite(settings?.magicRingDefaultStitches) ? Math.max(3, Math.round(settings.magicRingDefaultStitches)) : 6
      mrCountResult = {
        ...mrCountResult,
        magicRing: {
          ...mrCountResult.magicRing,
          stitchCount: defaultS,
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
          overrideStitchCount: defaultS,
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

      set({ nodes: nodesResult?.nodeRing0 || null, scaffold: nodesResult?.scaffold || null, chainScaffold: [], stitchCounts: [], scaffoldCenter: nodesResult?.nodeRing0?.meta?.center || null, lastGeneratedAt: Date.now() })

      // Auto-generate visual scaffold lines across all subsequent layers using circumference-based increases
      try {
        const metaCenterArr = nodesResult?.nodeRing0?.meta?.center || [startCenter.x, startCenter.y, startCenter.z]
        const centerV = new THREE.Vector3(metaCenterArr[0], metaCenterArr[1], metaCenterArr[2])
        const startY = centerV.y
        const increaseFactor = Number.isFinite(settings?.increaseFactor) ? settings.increaseFactor : 1.0
        const decreaseFactor = Number.isFinite(settings?.decreaseFactor) ? settings.decreaseFactor : 1.0
        const spacingMode = settings?.planSpacingMode || 'even'
        const targetSpacing = Math.max(1e-6, actualStitchWidth * effectiveTightenFactor)

        // Build ordered list of layers strictly below the MR
        const layersBelow = (generated.layers || [])
          .filter(l => Number.isFinite(l?.y) && l.y < startY)
          .sort((a, b) => b.y - a.y) // top-down

        // Initialize with MR nodes as the current ring
        let currentNodes = (nodesResult?.nodeRing0?.nodes || []).map(n => ({ p: [...n.p] }))
        let currentCount = currentNodes.length
        let currentRadius = nodesResult?.nodeRing0?.meta?.radius || 1

        const chainSegments = []
        const countsPerLayer = []
        // Include MR layer count first
        countsPerLayer.push({ y: startY, count: currentCount })
        let prevStepSegments = null
        for (const layer of layersBelow) {
          const yNext = Number(layer.y)
          const rNext = averageRadiusFromPolyline(layer?.polylines?.[0], centerV) || currentRadius
          // 1) Count stitches for next layer
          const curCirc = 2 * Math.PI * currentRadius
          const nextCirc = 2 * Math.PI * rNext
          const { nextCount: Nnext, plan } = countNextStitches({
            currentCount: currentCount,
            currentCircumference: curCirc,
            nextCircumference: nextCirc,
            yarnWidth: targetSpacing,
            increaseFactor,
            decreaseFactor,
            spacingMode,
            seed: Math.floor(yNext * 1000),
          })

          // 2) Evenly distribute next layer nodes
          const { nodes: nextNodes } = distributeNextNodes({ yNext, rNext: rNext, nextCount: Nnext, center: metaCenterArr, up: [0,1,0], handedness: effectiveHandedness })

          // 3) Build monotonic scaffold segments using the plan
          let segs = buildScaffoldSegments({ currentNodes, nextNodes, plan })

          // Enforce continuity from the previous step (tip-to-tip)
          const contiguous = enforceStepContinuity(prevStepSegments, segs)
          // Snap endpoints to the actual layer polyline to avoid drift from ideal circle
          const snapped = (layer?.polylines?.[0])
            ? contiguous.map(([a,b]) => {
                const vec = new THREE.Vector3(b[0], b[1], b[2])
                const hit = nearestPointOnPolyline(layer, vec) || vec
                return [a, [hit.x, hit.y, hit.z]]
              })
            : contiguous
          const interLayer = filterInterLayerOnly(snapped)
          chainSegments.push(...interLayer)
          prevStepSegments = interLayer
          // Use snapped endpoints as the current nodes for next iteration to keep tip-to-tip on the ring
          currentNodes = interLayer.map(seg => ({ p: seg[1] }))
          currentCount = Nnext
          currentRadius = rNext
          countsPerLayer.push({ y: yNext, count: Nnext })
        }

        // Update immediate next for cyan lines (first step only)
        const firstBatch = chainSegments.slice(0, currentNodes.length || 0)
        set({ nextNodes: null, nextScaffold: { segments: firstBatch, meta: { center: metaCenterArr } }, chainScaffold: chainSegments, stitchCounts: countsPerLayer, scaffoldCenter: metaCenterArr })
      } catch (_) { /* noop */ }
    } finally {
      set({ isGenerating: false })
    }
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


