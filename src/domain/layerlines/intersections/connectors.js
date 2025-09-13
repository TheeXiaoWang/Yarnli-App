import { computeStitchDimensions } from '../stitches'
import { clipPolylinesAgainstObject, isPointInsideObject } from '../common'

export function buildConnectorPaths(result, obj, cutters, settings, context) {
  const { lastKept, cutLoops, touched, perLayerBoundaries } = context
  const out = []
  const main = lastKept?.polylines?.[0]
  if (!Array.isArray(main) || main.length <= 1 || !cutLoops?.length) return out

  const avgSeg = (() => {
    let acc = 0
    for (let i=0;i<main.length-1;i++) {
      const a = main[i], b = main[i+1]
      acc += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2])
    }
    return acc/Math.max(1,main.length-1)
  })()

  const centerCut = cutters[0] ? context.getWorldCenter(cutters[0]) : null
  const clearance = computeStitchDimensions({ sizeLevel: settings?.yarnSizeLevel ?? 4 }).height * 0.2

  // Helper to clip a segment against all cutters, returning the longest remaining piece
  const clipSeg = (seg) => {
    let segs = [seg]
    for (const cut of cutters) {
      const next = []
      for (const s of segs) {
        const out = clipPolylinesAgainstObject([s], cut)
        if (out.polylines.length) next.push(...out.polylines)
      }
      segs = next
      if (segs.length === 0) break
    }
    if (!segs.length) return null
    return segs.reduce((a,b)=>{
      const la = Math.hypot(a[0][0]-a[a.length-1][0], a[0][1]-a[a.length-1][1], a[0][2]-a[a.length-1][2])
      const lb = Math.hypot(b[0][0]-b[b.length-1][0], b[0][1]-b[b.length-1][1], b[0][2]-b[b.length-1][2])
      return lb>la?b:a
    })
  }

  // Build here only the core ladder/tip chains using context-provided rings list
  const { ringsOrdered, pickNearestOnRing } = context

  // DEBUG: connector preflight info
  try {
    console.groupCollapsed(`connectors: obj=${obj?.name||obj?.id||'unknown'} rings=${Array.isArray(ringsOrdered)?ringsOrdered.length:0} cutLoops=${cutLoops?.length||0}`)
    console.log('has pickNearestOnRing:', typeof pickNearestOnRing === 'function')
    console.log('nearMap size:', context?.nearMap instanceof Map ? context.nearMap.size : (context?.nearMap ? 'truthy(non-Map)' : 0))
    console.log('loopCentroid:', context?.loopCentroid)
    console.log('getWorldCenter exists:', typeof context?.getWorldCenter === 'function')
  } catch (_) {}
  if (!Array.isArray(ringsOrdered) || ringsOrdered.length === 0) {
    try { console.warn('connectors: missing ringsOrdered; nothing to connect') } catch (_) {}
    try { console.groupEnd() } catch (_) {}
    return out
  }
  let prev=null
  let created = 0
  for (const ring of ringsOrdered) {
    const pt = context.nearMap?.get(ring) || pickNearestOnRing(ring, context.loopCentroid)
    if (!pt) continue
    if (prev) {
      const seg = clipSeg([prev, pt])
      if (seg) {
        out.push({ y: (prev[1]+pt[1])/2, polylines: [seg], isLadder: true })
        created++
      } else {
        try { console.warn('connectors: segment fully clipped between pts', prev, pt) } catch (_) {}
      }
    }
    prev = pt
  }
  try { console.log('connectors: created segments =', created); console.groupEnd() } catch (_) {}
  return out
}


