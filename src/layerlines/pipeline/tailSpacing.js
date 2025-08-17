import { computeStitchDimensions } from '../stitches'

export function enforceTailSpacing(layers, settings, markers) {
  const { height: stitchH } = computeStitchDimensions({ sizeLevel: settings.yarnSizeLevel ?? 4 })
  // Only guard the final ring. Do NOT exceed regular spacing or we will eat the
  // whole stack one-by-one. Keep thresholds slightly below one stitch height to
  // allow minor numerical variation but cull the "forced last ring" near the pole.
  const minPrevGap = Math.max(1e-4, stitchH * 0.98)
  const minPoleGap = Math.max(1e-4, stitchH * 0.98)

  const nearestBetween = (a,b) => {
    if (!a||!b) return Infinity
    const step = Math.max(1, Math.floor(Math.max(a.length,b.length)/64))
    let best = Infinity
    for (let i=0;i<a.length;i+=step) {
      const p = a[i]
      for (let j=0;j<b.length;j+=step) {
        const q = b[j]
        const d = Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2])
        if (d<best) best=d
      }
    }
    return best
  }
  const nearestToAny = (poly, pts) => {
    if (!poly || !pts || pts.length===0) return Infinity
    const step = Math.max(1, Math.floor(poly.length/64))
    let best = Infinity
    for (let i=0;i<poly.length;i+=step) {
      const p = poly[i]
      for (const q of pts) {
        const d = Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2])
        if (d<best) best=d
      }
    }
    return best
  }

  const poles = (markers?.poles||[]).map(e => Array.isArray(e)? e : e.p).filter(Boolean)
  const byAxis = [...layers].sort((a,b)=>{
    const ka=(a._keyAlongAxis??a.y??0); const kb=(b._keyAlongAxis??b.y??0)
    return ka-kb
  })
  if (byAxis.length < 2) return layers

  const endStats = (endIdx) => {
    const cur = byAxis[endIdx]
    const nbr = byAxis[endIdx === 0 ? 1 : byAxis.length - 2]
    const pc = (cur.polylines||[])[0]
    const pn = (nbr.polylines||[])[0]
    const gapPrev = nearestBetween(pc, pn)
    const gapPole = nearestToAny(pc, poles)
    // Use only 3D gaps which are orientation-agnostic; projected key spacing can shrink under rotation
    return { cur, gapPrev, gapPole, minGap: Math.min(gapPrev, gapPole) }
  }

  const s0 = endStats(0)
  const s1 = endStats(byAxis.length - 1)
  const worst = s0.minGap <= s1.minGap ? s0 : s1
  if (worst.gapPrev < minPrevGap || worst.gapPole < minPoleGap) {
    return layers.filter(l => l !== worst.cur)
  }
  return layers
}


