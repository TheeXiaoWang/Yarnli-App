import * as THREE from 'three'
import { computeSceneBBox, computeObjectBBox, getWorldCenter } from './common'
import { Generators, Intersections, enforceTailSpacing, detectOvalStart, determinePoleRoles } from './pipeline/index.js'
import { computeSliceDirForObject } from './pipeline/perObject.js'
import { annotateLayersWithKeys } from './pipeline/annotateLayers.js'
import { isOvalByAxes } from './pipeline/ovalGate.js'
import { computeStitchDimensions } from './stitches'

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

  // Compute intersection plan (priorities and cutters per object)
  const visible = objects.filter((o) => o.visible)
  const { ordered, priorities, ranks, cuttersMap } = Intersections.computeIntersectionPlan(visible)

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

    // Tag layers with local id and a monotonic key along the same slicing direction used by the generator
    const worldMat = new THREE.Matrix4()
      .compose(new THREE.Vector3(...obj.position),
               new THREE.Quaternion().setFromEuler(new THREE.Euler(obj.rotation[0]*Math.PI/180, obj.rotation[1]*Math.PI/180, obj.rotation[2]*Math.PI/180)),
               new THREE.Vector3(...obj.scale))
    const dirKey = perCall.sliceDir || [0,1,0]
    result.layers = annotateLayersWithKeys(result.layers, worldMat, dirKey)

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
    // Determine weakness by rank, not raw score; smaller rank means stronger
    const objRank = ranks.get(obj.id) ?? 0
    const minNeighborRank = Math.min(...(cutters.length ? cutters.map(c => ranks.get(c.id) ?? 9999) : [9999]))
    const surfaceOnly = objRank > minNeighborRank
    if (surfaceOnly) {
      const clipped = Intersections.clipLayersAgainstCuttersWithMarkers(result, obj, cutters, { ...settings, keepOnlySurface: true })
      if (clipped.masks && clipped.masks.length) subtractionMasks.push(...clipped.masks)
      
      // Filter out small/fragmented layer segments to improve visual quality
      const fragmentFilterOptions = {
        minPerimeterRatio: settings.minFragmentRatio ?? 0.2  // Keep segments ≥20% of original layer
      }
      const filteredLayers = Intersections.filterLayerFragments(clipped.layers, fragmentFilterOptions)
      result.layers = filteredLayers
      
      // propagate intersection markers for debug rendering
      if (Array.isArray(clipped.markers?.boundaryByLayer)) markers.boundaries.push(...clipped.markers.boundaryByLayer.map((e)=>({ points: e.points })))
      if (Array.isArray(clipped.markers?.cutLoops)) markers.cutLoops.push(...clipped.markers.cutLoops.map(loop=>({ loop })))

      // Attempt to build connector (ladder) segments between successive rings
      try {
        const ringsOrdered = [...result.layers]
          .map(l=>l?.polylines?.[0])
          .filter(Boolean)
        const pickNearestOnRing = (ring, ref) => {
          if (!ring || !ref) return null
          let best=null, bestD2=Infinity
          for (const p of ring) {
            const dx=p[0]-ref[0], dy=p[1]-ref[1], dz=p[2]-ref[2]
            const d2=dx*dx+dy*dy+dz*dz
            if (d2<bestD2) { bestD2=d2; best=p }
          }
          return best
        }
        const loopCentroid = (()=>{
          const first = clipped.markers?.cutLoops?.[0]
          if (!first || first.length===0) return null
          let sx=0,sy=0,sz=0
          for (const p of first) { sx+=p[0]; sy+=p[1]; sz+=p[2] }
          const n = first.length
          return [sx/n, sy/n, sz/n]
        })()
        const context = {
          lastKept: ringsOrdered[0] ? { polylines: [ringsOrdered[0]] } : null,
          cutLoops: clipped.markers?.cutLoops || [],
          ringsOrdered,
          pickNearestOnRing,
          loopCentroid,
          nearMap: new Map(),
          getWorldCenter,
        }
        const ladders = Intersections.buildConnectorPaths(result, obj, cutters, settings, context)
        if (Array.isArray(ladders) && ladders.length) {
          result.layers.push(...ladders)
        }
      } catch (err) {
        try { console.warn('connector-build failed', err) } catch(_) {}
      }
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
          markers.poles.push({ p: pos, role, objectId: obj.id, objectType: obj.type })
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
