import { computeObjectBBox, getWorldCenter, clipPolylinesAgainstObject, isPointInsideObject } from '../common'
import { computeStitchDimensions } from '../stitches'
import { buildIntersectionLoop } from '../common'
import { polylineLength3D } from '../circumference'

// Re-export helper used elsewhere
export { buildIntersectionLoop } from '../common'

// Helper: reclassify nearly-complete cut rings as closed loops
function maybeReclassifyAsClosed(polylines, fullCircumference) {
  // Entry log to confirm wiring
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[clip.js] reclassify check entered')
  }
  if (!polylines || polylines.length === 0) return polylines
  if (polylines.length === 1) return polylines // already closed
  const visible = polylines.reduce((sum, poly) => sum + polylineLength3D(poly, false), 0)
  const coverage = fullCircumference > 0 ? visible / fullCircumference : 0

  // Debug coverage in DEV builds
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(
      `[clip.js] coverage=${(coverage * 100).toFixed(2)}%`,
      `visible=${visible.toFixed(2)}`,
      `full=${fullCircumference.toFixed(2)}`
    )
    // eslint-disable-next-line no-console
    console.log('[coverage-check]', { coverage, visibleLength: visible, fullCircumference })
  }

  const COVERAGE_THRESHOLD = 0.95
  if (coverage >= COVERAGE_THRESHOLD) {
    // Merge into one "pseudo-closed" ring by concatenating
    const merged = polylines.flat()
    // Ensure first==last to mark closed
    if (merged.length && (
      merged[0][0] !== merged[merged.length-1][0] ||
      merged[0][1] !== merged[merged.length-1][1] ||
      merged[0][2] !== merged[merged.length-1][2]
    )) {
      merged.push([...merged[0]])
    }
    return [merged]
  }
  return polylines
}

// The big clipping routine factored from intersections.js. The logic is unchanged,
// only moved so it can be read in isolation.
export function clipLayersAgainstCuttersWithMarkers(result, obj, cutters, settings) {
  if (!result || !Array.isArray(result.layers)) return { layers: [], masks: [], markers: null }
  if (!cutters || cutters.length === 0) return { layers: result.layers, masks: [], markers: null }
  if (settings && settings.clipAgainstObjects === false) return { layers: result.layers, masks: [], markers: null }

  const newLayers = []
  const masks = []
  const intersectionTrace = []
  const cutLoops = []
  const touched = new Set()
  const perLayerBoundaries = new Map()
  let minKeyTouched = Number.POSITIVE_INFINITY

  for (const cutter of cutters) {
    const bbObj = computeObjectBBox(obj)
    const bbCut = computeObjectBBox(cutter)
    if (!bbObj || !bbCut) continue

    const tmpLayers = []
    let anyThisCutter = false
    const tmpTrace = []
    for (const l of (newLayers.length ? newLayers : result.layers)) {
      const { polylines, hadIntersection, boundaryPoints } = clipPolylinesAgainstObject(l.polylines, cutter)
      if (polylines.length) {
        // Prefer stamped baseline, fallback to local estimate
        const baseline = (typeof l.fullCircumference === 'number' && l.fullCircumference > 0)
          ? l.fullCircumference
          : (l.polylines?.reduce((sum, p) => sum + polylineLength3D(p, true), 0) || 0)

        // Gap-based reclassification: if the missing arc is smaller than one stitch width,
        // treat as a closed ring.
        let reclassifiedPolylines = polylines
        try {
          const visibleLength = polylines.reduce((sum, p) => sum + polylineLength3D(p, false), 0)
          const fullCircumference = baseline
          const coverage = fullCircumference > 0 ? (visibleLength / fullCircumference) : 0
          const gap = Math.max(0, fullCircumference - visibleLength)
          const yarnWidth = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4 }).width

          if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[coverage-check]', { coverage, visibleLength, fullCircumference, gap, yarnWidth })
          }

          if (Array.isArray(polylines) && polylines.length > 1 && gap <= yarnWidth) {
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.log('[clip.js] reclassified as closed, gap=', gap, 'yarnWidth=', yarnWidth)
            }
            // Prefer restoring the pristine full loop if available on the layer
            const loop = Array.isArray(l.fullLoop) && l.fullLoop.length > 2 ? l.fullLoop : null
            if (loop) {
              reclassifiedPolylines = [loop.map((p) => [...p])]
              if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.log('[clip.js] Restored full closed loop (gap small enough)')
              }
            } else {
              const merged = polylines.flat()
              if (merged.length > 2) {
                const a = merged[0]
                const b = merged[merged.length - 1]
                if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) merged.push([...a])
                reclassifiedPolylines = [merged]
              }
            }
          }
        } catch (_) {}

        tmpLayers.push({ ...l, polylines: reclassifiedPolylines })
      }
      anyThisCutter = anyThisCutter || hadIntersection
      if (boundaryPoints && boundaryPoints.length) tmpTrace.push(...boundaryPoints)
      if (hadIntersection && l._lid != null) {
        touched.add(l._lid)
        if (l._keyAlongAxis != null) minKeyTouched = Math.min(minKeyTouched, l._keyAlongAxis)
        const arr = perLayerBoundaries.get(l._lid) || []
        arr.push(...boundaryPoints)
        perLayerBoundaries.set(l._lid, arr)
      }
    }
    if (anyThisCutter) {
      masks.push({ objectId: obj.id, cutterId: cutter.id })
      // Build cut loop but do not return as a drawable layer
      if (tmpTrace.length >= 2) {
        const loop = buildIntersectionLoop(tmpTrace)
        if (loop.length >= 2) cutLoops.push(loop)
      }
    }
    result.layers = tmpLayers
    newLayers.length = 0
    newLayers.push(...tmpLayers)
  }

  // Keep only rings up to first touch and any ring that was touched
  const stitchH = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4 }).height
  const minLen = Math.max(1e-4, stitchH * 1.2)
  const lenOf = (pts) => pts.reduce((s,_,i)=> i? s+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2]) : 0, 0)
  const extentOf = (pts) => {
    let minx=Infinity,miny=Infinity,minz=Infinity,maxx=-Infinity,maxy=-Infinity,maxz=-Infinity
    for (const p of pts) { minx=Math.min(minx,p[0]); miny=Math.min(miny,p[1]); minz=Math.min(minz,p[2]); maxx=Math.max(maxx,p[0]); maxy=Math.max(maxy,p[1]); maxz=Math.max(maxz,p[2]) }
    return Math.hypot(maxx-minx, maxy-miny, maxz-minz)
  }
  const isSignificant = (l) => {
    if (!l || !l.polylines || l.polylines.length===0) return false
    if (l.isConnector || l.isLadder || l.isTipChain || l.isEdgeArc || l.isOffset) return true
    const longest = l.polylines.reduce((acc,p)=>Math.max(acc,lenOf(p)),0)
    const span = l.polylines.reduce((acc,p)=>Math.max(acc,extentOf(p)),0)
    const pts = Math.max(...l.polylines.map(p=>p.length))
    return longest>=minLen && span>=minLen*0.5 && pts>=8
  }

  const base = (newLayers.length? newLayers: result.layers)
  // Always preserve the first two and last two rings along the slicing axis to avoid losing
  // the starting layers near the poles, even if they look like small slivers numerically.
  const sorted = [...base].sort((a,b)=>{
    const ka=(a._keyAlongAxis??a.y??0); const kb=(b._keyAlongAxis??b.y??0)
    return ka-kb
  })
  const preserve = new Set()
  if (sorted.length>0) preserve.add(sorted[0])
  if (sorted.length>1) preserve.add(sorted[1])
  if (sorted.length>2) preserve.add(sorted[sorted.length-1])
  if (sorted.length>3) preserve.add(sorted[sorted.length-2])
  const filtered = base.filter(l => preserve.has(l) || isSignificant(l))

  return {
    layers: filtered,
    masks,
    markers: { objectId: obj.id, boundaryByLayer: Array.from(perLayerBoundaries.entries()).map(([lid, points]) => ({ lid, points })), cutLoops }
  }
}


