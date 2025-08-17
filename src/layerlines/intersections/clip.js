import { computeObjectBBox, getWorldCenter, clipPolylinesAgainstObject, isPointInsideObject } from '../common'
import { computeStitchDimensions } from '../stitches'
import { buildIntersectionLoop } from '../common'

// Re-export helper used elsewhere
export { buildIntersectionLoop } from '../common'

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
      if (polylines.length) tmpLayers.push({ ...l, polylines })
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


