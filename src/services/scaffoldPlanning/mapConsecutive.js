// Build a monotonic, order-preserving parent->children mapping
// guaranteeing coverage of all next indices and consecutive children only.
// - On increases (nextCount >= currentCount):
//   Each parent gets either base or base+1 consecutive children; all children 0..next-1 covered once.
// - On decreases (nextCount < currentCount):
//   Each parent maps to exactly one child index k = floor(j * next / current).
// Returns array parentToChildren where parentToChildren[j] is an array of child indices.
export function mapConsecutiveBuckets(currentCount, nextCount, weights = null) {
  const buckets = Array.from({ length: currentCount }, () => [])
  if (currentCount <= 0 || nextCount <= 0) return buckets

  if (nextCount >= currentCount) {
    // Weighted distribution of extras: base = 1, distribute (next-current) extra children
    const base = Math.floor(nextCount / currentCount)
    const extra = nextCount - base * currentCount
    const weightArr = Array.isArray(weights) && weights.length === currentCount
      ? weights.slice()
      : Array.from({ length: currentCount }, (_, j) => 1)
    const order = Array.from({ length: currentCount }, (_, j) => j).sort((a, b) => (weightArr[b] - weightArr[a]))
    const extraSet = new Set(order.slice(0, extra))
    let k = 0
    for (let j = 0; j < currentCount; j++) {
      const take = base + (extraSet.has(j) ? 1 : 0)
      for (let t = 0; t < take; t++) {
        if (k < nextCount) buckets[j].push(k)
        k++
      }
    }
  } else {
    // Decrease: choose anchors (kept stitches) by highest weights; others merge to nearest anchor
    const useWeights = Array.isArray(weights) && weights.length === currentCount
    if (useWeights) {
      const order = Array.from({ length: currentCount }, (_, j) => j).sort((a, b) => (weights[b] - weights[a]))
      const anchors = order.slice(0, nextCount).sort((a, b) => a - b)
      // Build cyclic walk starting at first anchor
      const start = anchors[0]
      let k = 0
      let nextAnchorIdx = 1 % anchors.length
      let nextAnchor = anchors[nextAnchorIdx]
      for (let t = 0; t < currentCount; t++) {
        const j = (start + t) % currentCount
        buckets[j].push(k)
        if (((j + 1) % currentCount) === nextAnchor) {
          k = Math.min(k + 1, nextCount - 1)
          nextAnchorIdx = (nextAnchorIdx + 1) % anchors.length
          nextAnchor = anchors[nextAnchorIdx]
        }
      }
    } else {
      // Fallback proportional mapping
      for (let j = 0; j < currentCount; j++) {
        const k = Math.floor((j * nextCount) / currentCount)
        buckets[j].push(k)
      }
    }
  }
  return buckets
}


