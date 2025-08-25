/**
 * Determine next-layer stitch counts (singles/increases/decreases) from circumference change.
 *
 * Inputs:
 * - currentCount: number of stitches (nodes) on current layer
 * - currentCircumference: 2πr for current layer
 * - nextCircumference: 2πr for next layer
 * - yarnWidth: effective stitch width in world units (spacing baseline)
 * - increaseFactor: scales aggressiveness of increases (default 1.0)
 *
 * Output:
 * - { nextCount, plan: Array<'inc'|'sc'|'dec'> }
 *   plan length === currentCount, each entry is action for that current stitch
 *   inc = add one extra stitch after this stitch (→ two targets), sc = carry one, dec = merge
 */
export function countNextStitches({ currentCount, currentCircumference, nextCircumference, yarnWidth, increaseFactor = 1.0, decreaseFactor = 1.0, spacingMode = 'even', seed = 0 }) {
  const cc = Math.max(1, Math.round(currentCount))
  const c0 = Math.max(1e-6, Number(currentCircumference) || 0)
  const c1 = Math.max(1e-6, Number(nextCircumference) || 0)
  const w = Math.max(1e-6, Number(yarnWidth) || 0)

  // Desired count based on spacing rule
  const raw = (c1 / w)
  const factor = c1 >= c0 ? increaseFactor : decreaseFactor
  const desired = Math.round(raw * factor)
  let nextCount = Math.max(1, desired)

  // Compute delta vs current
  const delta = nextCount - cc

  const plan = new Array(cc).fill('sc')

  // Helper: deterministic PRNG (LCG)
  let rngState = (Math.floor(seed) >>> 0) || 1
  const rnd = () => {
    // LCG constants (Numerical Recipes)
    rngState = (1664525 * rngState + 1013904223) >>> 0
    return rngState / 0xffffffff
  }

  const placeActions = (count, tag) => {
    if (count <= 0) return
    if (spacingMode === 'even' || count === 1) {
      for (let k = 0; k < count; k++) {
        const j = Math.floor((k * cc) / count)
        plan[j] = tag
      }
      return
    }
    // 'jagged' mode: jitter around evenly spaced anchors with a minimum gap
    const anchors = []
    const baseGap = cc / count
    const jitter = Math.max(0, Math.floor(baseGap * 0.4)) // up to 40% jitter
    const minGap = Math.max(1, Math.floor(baseGap * 0.5)) // ensure at least half even spacing
    const chosen = []
    const isFarEnough = (idx) => chosen.every((t) => {
      const d = Math.abs(idx - t)
      const wrap = cc - d
      return Math.min(d, wrap) >= minGap
    })
    for (let k = 0; k < count; k++) {
      const base = Math.floor(k * baseGap)
      const off = jitter > 0 ? (Math.floor((rnd() * (2 * jitter + 1)) - jitter)) : 0
      let j = ((base + off) % cc + cc) % cc
      if (!isFarEnough(j)) {
        // search outward for nearest admissible slot within one base gap
        let found = -1
        const searchMax = Math.max(1, Math.floor(baseGap))
        for (let s = 1; s <= searchMax; s++) {
          const j1 = ((j + s) % cc + cc) % cc
          if (isFarEnough(j1)) { found = j1; break }
          const j2 = ((j - s) % cc + cc) % cc
          if (isFarEnough(j2)) { found = j2; break }
        }
        if (found >= 0) j = found
      }
      if (isFarEnough(j)) chosen.push(j)
      else {
        // fallback: place at evenly spaced slot
        const jEven = Math.floor((k * cc) / count)
        if (isFarEnough(jEven)) chosen.push(jEven)
      }
    }
    // In rare cases we may have fewer picks; fill remaining greedily
    while (chosen.length < count) {
      let best = -1, bestScore = -1
      for (let j = 0; j < cc; j++) {
        if (plan[j] !== 'sc' || chosen.includes(j)) continue
        const score = chosen.reduce((m, t) => {
          const d = Math.abs(j - t); const wrap = cc - d; const dd = Math.min(d, wrap)
          return Math.min(m, dd)
        }, Infinity)
        if (score > bestScore) { bestScore = score; best = j }
      }
      if (best >= 0) { chosen.push(best) } else { break }
    }
    for (const j of chosen) plan[j] = tag
  }

  if (delta > 0) {
    placeActions(delta, 'inc')
  } else if (delta < 0) {
    placeActions(-delta, 'dec')
  }

  return { nextCount, plan }
}


