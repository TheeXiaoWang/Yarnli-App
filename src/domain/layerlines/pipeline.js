import * as THREE from 'three'
import { computeSceneBBox, computeObjectBBox, getWorldCenter, aabbsIntersect } from './common'
import { detectPrimaryAxis } from '../nodes/utils/orientation/detectPrimaryAxis.js'
import { Generators, Intersections, enforceTailSpacing, detectOvalStart, determinePoleRoles } from './pipeline/index.js'
import { computeSliceDirForObject } from './pipeline/perObject.js'
import { annotateLayersWithKeys } from './pipeline/annotateLayers.js'
import { isOvalByAxes } from './pipeline/ovalGate.js'
import { computeStitchDimensions } from './stitches'
import { polylineLength3D } from './circumference'

export function generateLayerLines(objects, settings) {
  const bbox = computeSceneBBox(objects)
  const { maxLayers = 200000, previewLayers = 100000 } = settings

  // Derive dimensions from yarn size + stitch kind; fall back to legacy values
  const { width: derivedSpacing, height: derivedHeight } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseWidth: 1,
    baseHeight: 1,
  })

  const effective = {
    ...settings,
    stitchSize: derivedSpacing || settings.stitchSize,
    layerHeight: derivedHeight || settings.layerHeight,
    lineSpacing: derivedSpacing || settings.lineSpacing,
  }

  const layers = []
  const markers = { poles: [], ring0: [], boundaries: [], cutLoops: [] }
  let totalLineCount = 0

  // Priority plan: larger object wins in overlaps; build ordered list, ranks, and cutters
  const visible = objects.filter((o) => o.visible)

  const approxVolume = (obj) => {
    const sx = Math.abs(obj.scale?.[0] ?? 1)
    const sy = Math.abs(obj.scale?.[1] ?? 1)
    const sz = Math.abs(obj.scale?.[2] ?? 1)
    const det = sx * sy * sz
    if (obj.type === 'sphere') return (4 / 3) * Math.PI * det
    if (obj.type === 'cone') return (2 / 3) * Math.PI * det
    const bb = computeObjectBBox(obj)
    if (bb) {
      const dx = Math.max(0, bb.max[0] - bb.min[0])
      const dy = Math.max(0, bb.max[1] - bb.min[1])
      const dz = Math.max(0, bb.max[2] - bb.min[2])
      return dx * dy * dz
    }
    return det
  }

  const priorities = new Map()
  visible.forEach((o) => priorities.set(o.id, 0))

  // score objects: for each overlapping pair, increment the larger one's score
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const A = visible[i], B = visible[j]
      const bbA = computeObjectBBox(A)
      const bbB = computeObjectBBox(B)
      if (!bbA || !bbB || !aabbsIntersect(bbA, bbB)) continue
      const volA = approxVolume(A)
      const volB = approxVolume(B)
      if (volA >= volB) priorities.set(A.id, (priorities.get(A.id) || 0) + 1)
      else priorities.set(B.id, (priorities.get(B.id) || 0) + 1)
    }
  }

  const ordered = [...visible].sort((a, b) => (priorities.get(b.id) || 0) - (priorities.get(a.id) || 0))
  const ranks = new Map(ordered.map((o, idx) => [o.id, idx]))

  const cuttersMap = new Map()
  for (let i = 0; i < ordered.length; i++) {
    const obj = ordered[i]
    const bbObj = computeObjectBBox(obj)
    const cutters = []
    for (let k = 0; k < i; k++) { // only stronger (lower rank) can cut
      const cutter = ordered[k]
      const bbCut = computeObjectBBox(cutter)
      if (bbObj && bbCut && aabbsIntersect(bbObj, bbCut)) cutters.push(cutter)
    }
    cuttersMap.set(obj.id, cutters)
  }

  // Track masks of subtracted regions to emulate boolean-cut behavior
  const subtractionMasks = [] // array of { objectId, cutterId }

  for (let idx = 0; idx < ordered.length; idx++) {
    const obj = ordered[idx]
    const cutters = cuttersMap.get(obj.id) || []

    // Per-object effective settings (may override orientation for uniform spheres)
    const perCall = { ...effective }
    // Derive slice direction modularly
    perCall.sliceDir = perCall.sliceDir || computeSliceDirForObject(obj, cutters)

    let result = { layers: [], markers: { poles: [], ring0: [] } }
    if (obj.type === 'sphere') result = Generators.generateSphereLayers(obj, perCall, maxLayers)
    else if (obj.type === 'cone') result = Generators.generateConeLayers(obj, perCall, maxLayers)
    else if (obj.type === 'triangle') result = Generators.generateTriangleLayers(obj, perCall, maxLayers)

    // Detect primary axis once per object for downstream consumers
    try {
      const bb = computeObjectBBox(obj)
      const primary = bb ? detectPrimaryAxis(new THREE.Box3(new THREE.Vector3(...bb.min), new THREE.Vector3(...bb.max))) : 'y'
      if (!result.meta) result.meta = {}
      result.meta.primaryAxis = primary
      // eslint-disable-next-line no-console
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.log('[PrimaryAxis]', obj.id, primary)
    } catch(_) {}

    // Tag layers with local id and a monotonic key along the same slicing direction used by the generator
    const worldMat = new THREE.Matrix4()
      .compose(new THREE.Vector3(...obj.position),
               new THREE.Quaternion().setFromEuler(new THREE.Euler(obj.rotation[0]*Math.PI/180, obj.rotation[1]*Math.PI/180, obj.rotation[2]*Math.PI/180)),
               new THREE.Vector3(...obj.scale))
    const dirKey = perCall.sliceDir || [0,1,0]
    result.layers = annotateLayersWithKeys(result.layers, worldMat, dirKey)

    // Stamp persistent fullCircumference baseline before any clipping
    result.layers = result.layers.map((l) => {
      const polys = Array.isArray(l.polylines) ? l.polylines : []
      const fullCirc = polys.length ? polys.reduce((sum, p) => sum + polylineLength3D(p, true), 0) : 0
      // Choose the longest polyline as the canonical full loop
      let fullLoop = null
      if (polys.length) {
        const main = polys.reduce((a, b) => (b.length > a.length ? b : a))
        // Ensure closure (first==last) for the pristine loop
        const first = main[0]
        const last = main[main.length - 1]
        if (first && last && (first[0] !== last[0] || first[1] !== last[1] || first[2] !== last[2])) {
          const closed = [...main, [...first]]
          fullLoop = closed.map((p) => [...p])
        } else {
          fullLoop = main.map((p) => [...p])
        }
      }
      return { ...l, fullCircumference: fullCirc, fullLoop }
    })

    // Oval start detection per object; if oval → override ring0 marker and insert chain as the first starting layer
    try {
      const polesForObj = (result.markers?.poles || []).map(e => Array.isArray(e) ? { p: e } : e).filter(e => (e?.role === 'start' || e?.role == null))
      const startPole = polesForObj[0]?.p || null
      if (startPole && result.layers.length > 1) {
        const startCenter = new THREE.Vector3(startPole[0], startPole[1], startPole[2])
        // Normal: use sliceDir as ring plane normal if available
        const n = new THREE.Vector3(perCall.sliceDir?.[0] ?? 0, perCall.sliceDir?.[1] ?? 1, perCall.sliceDir?.[2] ?? 0)
        // Build a stable pole axis in WORLD space: from start to end pole for this object
        let poleAxis = null
        try {
          const poles = (result.markers?.poles || []).map(e => Array.isArray(e) ? { p: e } : e)
          const startP = poles.find(e => e?.role === 'start')?.p || poles[0]?.p
          const endP = poles.find(e => e?.role === 'end')?.p || poles[1]?.p
          if (startP && endP) {
            poleAxis = new THREE.Vector3(endP[0]-startP[0], endP[1]-startP[1], endP[2]-startP[2]).normalize()
          }
        } catch(_) {}
        // First, fast axis-based ovality check (prevents false positives for perfect spheres)
        const gate = isOvalByAxes(worldMat, dirKey, settings.ovalThreshold ?? 1.1)
        const isOvalByAxes = gate.isOval
        const axesRatio = gate.axesRatio
        try { console.log('[OvalAxes]', gate) } catch(_) {}

        let oval = null
        if (isOvalByAxes) {
          oval = detectOvalStart({
            layers: result.layers,
            startCenter,
            ringPlaneNormal: n,
            stitchGauge: { width: effective.lineSpacing || effective.stitchSize || 0.5 },
            ovalThreshold: ovalThreshold,
            chainThreshold: settings.chainThreshold ?? 1.6,
            poleAxis,
          })
        }
        try { console.log('[OvalDetect] isOval=', !!oval?.isOval, 'ratio=', oval?.ratio, 'hasStartSegment=', !!oval?.startSegment) } catch(_) {}
        if (oval?.isOval && oval?.startSegment) {
          // Prepend start segment as ring0 marker for visualization
          const poly = oval.startSegment
          result.markers.ring0 = [poly]
          // Compute sorting key along slicing direction like other layers
          const mid = poly[Math.floor(poly.length / 2)]
          const pMid = new THREE.Vector3(mid[0], mid[1], mid[2])
          const key = dirKey.dot(pMid) - dirKey.dot(origin)
          const chainLayer = {
            y: key,
            polylines: [poly],
            _keyAlongAxis: key,
            debugSource: { file: 'src/layerlines/pipeline/ovalDetector.js', fn: 'detectOvalStart', kind: 'oval-chain-start' },
            isSynthetic: true,
          }
          result.layers.unshift(chainLayer)
          // Expose poleAxis to viewer meta for pole sprite orientation
          try {
            if (!result.meta) result.meta = {}
            if (!result.meta.oval) result.meta.oval = {}
            result.meta.oval[obj.id] = { ...(result.meta.oval[obj.id]||{}), poleAxis: poleAxis ? [poleAxis.x, poleAxis.y, poleAxis.z] : null, axesRatio }
          } catch(_) {}
        }
      }
    } catch (_) {}

    // Optionally clip against higher-priority objects
    // Keep full layers for highest-priority objects (no cutters) and any object whose priority
    // is strictly greater than all of its intersecting neighbors. We apply surface-only only to
    // weaker objects.
    // Only clip weaker objects against stronger neighbors (by rank)
    const objRank = ranks.get(obj.id) ?? 0
    const minNeighborRank = Math.min(...(cutters.length ? cutters.map(c => ranks.get(c.id) ?? 9999) : [9999]))
    const surfaceOnly = objRank > minNeighborRank
    if (surfaceOnly && cutters.length > 0) {
      const clipped = Intersections.clipLayersAgainstCuttersWithMarkers(result, obj, cutters, { ...settings, keepOnlySurface: true })
      if (clipped.masks && clipped.masks.length) subtractionMasks.push(...clipped.masks)
      result.layers = clipped.layers
    }

    // Enforce tail spacing per object to avoid the common "90% + 10%" tail split
    // which happens when a forced last ring lands too close to the pole or the
    // previous ring. This removes the last layer if it violates the minimum gap.
    result.layers = enforceTailSpacing(result.layers, effective, result.markers)

    for (const l of result.layers) layers.push({ ...l, objectId: obj.id, objectType: obj.type })
    if (result.markers?.poles) {
      // Determine start/end roles robustly based on layer order and proximity
      const roles = determinePoleRoles(result.layers, result.markers.poles)
      for (const e of roles.poles) {
        const pos = e.p
        const role = e.role
        if (Array.isArray(pos) && pos.length === 3) {
          // Mark if this pole lies within any cutter's bounding box (approximate intersection)
          let intersected = false
          try {
            for (const cutter of cutters) {
              const bb = computeObjectBBox(cutter)
              if (!bb) continue
              const min = bb.min, max = bb.max
              const x = pos[0], y = pos[1], z = pos[2]
              if (x >= min[0] - 1e-6 && x <= max[0] + 1e-6 &&
                  y >= min[1] - 1e-6 && y <= max[1] + 1e-6 &&
                  z >= min[2] - 1e-6 && z <= max[2] + 1e-6) { intersected = true; break }
            }
          } catch (_) {}
          markers.poles.push({ p: pos, role, objectId: obj.id, objectType: obj.type, intersected })
        }
      }
    }
    if (result.markers?.ring0) markers.ring0.push(...result.markers.ring0)
  }

  // sort then trim for preview: prefer the slicing-axis key when available to maintain
  // correct top→bottom ordering regardless of object orientation
  layers.sort((a, b) => {
    const ka = (a._keyAlongAxis != null) ? a._keyAlongAxis : (a.y ?? 0)
    const kb = (b._keyAlongAxis != null) ? b._keyAlongAxis : (b.y ?? 0)
    return ka - kb
  })
  let trimmed = layers
  const cap = Math.max(1, settings.previewLayers || 1000)
  if (layers.length > cap) {
    // Per-object proportional sampling to avoid starving smaller objects
    const byObj = new Map()
    for (const l of layers) {
      const id = l.objectId ?? 'unknown'
      if (!byObj.has(id)) byObj.set(id, [])
      byObj.get(id).push(l)
    }
    const entries = Array.from(byObj.entries())
    const total = layers.length
    const allocations = entries.map(([, arr]) => Math.max(1, Math.floor((arr.length / total) * cap)))
    let remain = cap - allocations.reduce((a,b)=>a+b,0)
    for (let i = 0; i < allocations.length && remain > 0; i++) { allocations[i]++; remain-- }
    const out = []
    entries.forEach(([id, arr], idx) => {
      const k = allocations[idx]
      if (arr.length <= k) { out.push(...arr) }
      else {
        const step = (arr.length - 1) / (k - 1)
        for (let i = 0; i < k; i++) out.push(arr[Math.round(i * step)])
      }
    })
    // keep output order by y
    out.sort((a,b)=>a.y-b.y)
    trimmed = out
  }
  // If no cutters exist (single-object scene), ensure each layer is a single closed loop (force close)
  if (visible.length === 1) {
    trimmed = trimmed.map(l => {
      if (!l.polylines || l.polylines.length === 0) return l
      const main = l.polylines.reduce((a, b) => (b.length > a.length ? b : a))
      const first = main[0]
      const last = main[main.length - 1]
      const dx = first[0] - last[0], dy = first[1] - last[1], dz = first[2] - last[2]
      if (dx * dx + dy * dy + dz * dz > 1e-6) main.push([...first])
      return { ...l, polylines: [main] }
    })
  }
  totalLineCount = trimmed.reduce((acc, l) => acc + l.polylines.reduce((p, poly) => p + poly.length, 0), 0)

  return {
    layers: trimmed,
    stats: { layerCount: trimmed.length, totalLineCount },
    bbox,
    markers,
    meta: {
      priorities: Object.fromEntries(priorities),
      ranks: Object.fromEntries(ranks),
      subtractionMasks,
      volumes: Object.fromEntries(
        visible.map(o => [
          o.id,
          (Math.abs(o.scale?.[0] || 1) * Math.abs(o.scale?.[1] || 1) * Math.abs(o.scale?.[2] || 1)) *
            (o.type === 'sphere' ? (4 / 3) * Math.PI : o.type === 'cone' ? (2 / 3) * Math.PI : 1)
        ])
      )
    },
  }
}
