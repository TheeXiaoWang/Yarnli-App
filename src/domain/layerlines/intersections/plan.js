import { computeObjectBBox, aabbsIntersect, estimateNonOverlappingVolume, getWorldCenter } from '../common'

// Keep in sync with legacy exports for backwards-compatibility
export function approximateTotalVolume(obj) {
  const sx = Math.abs(obj.scale?.[0] ?? 1)
  const sy = Math.abs(obj.scale?.[1] ?? 1)
  const sz = Math.abs(obj.scale?.[2] ?? 1)
  const scaleDet = sx * sy * sz
  if (obj.type === 'sphere') {
    const base = (4 / 3) * Math.PI // unit sphere r=1
    return base * scaleDet
  }
  if (obj.type === 'cone') {
    const base = (2 / 3) * Math.PI // unit cone r=1, h=2
    return base * scaleDet
  }
  if (obj.type === 'cylinder') {
    const base = 2 * Math.PI // unit cylinder r=1, h=2 -> V = π r^2 h = 2π
    return base * scaleDet
  }
  if (obj.type === 'capsule') {
    // Unit capsule in codebase: radius=0.5, cylinder length=1
    // V = π r^2 h + (4/3)π r^3 = π*(0.25)*1 + (4/3)π*(0.125) = (5/12)π
    const base = (5 / 12) * Math.PI
    return base * scaleDet
  }
  // fallback to AABB volume
  const bb = computeObjectBBox(obj)
  if (bb) {
    const dx = Math.max(0, bb.max[0] - bb.min[0])
    const dy = Math.max(0, bb.max[1] - bb.min[1])
    const dz = Math.max(0, bb.max[2] - bb.min[2])
    return dx * dy * dz
  }
  return scaleDet
}

// Compute priorities based on remaining (non-overlapping) mass.
// Returns: { ordered: Object[], priorities: Map<objectId, number>, ranks: Map<objectId, number>, cuttersMap: Map<objectId, Object[]> }
export function computeIntersectionPlan(objects) {
  const visible = objects.filter((o) => o.visible)
  const bboxes = visible.map((o) => computeObjectBBox(o))
  const priorities = new Map()
  for (let i = 0; i < visible.length; i++) priorities.set(visible[i].id, 0)

  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const A = visible[i], B = visible[j]
      const bbA = bboxes[i], bbB = bboxes[j]
      if (!bbA || !bbB || !aabbsIntersect(bbA, bbB)) continue

      // If either side is set to 'weak', invert the usual rule: smaller total volume wins
      const invert = (A.priorityOverride === 'weak') || (B.priorityOverride === 'weak')
      if (invert) {
        const volA = approximateTotalVolume(A)
        const volB = approximateTotalVolume(B)
        const winner = (volA <= volB) ? A : B
        priorities.set(winner.id, (priorities.get(winner.id) || 0) + 1)
        continue
      }

      // AUTO: use existing mass-based rule with volume fallback (bigger usually wins)
      const massA = estimateNonOverlappingVolume(A, B, 8000)
      const massB = estimateNonOverlappingVolume(B, A, 8000)
      const eps = 1e-6
      if (Math.abs(massA - massB) < eps) {
        // Prefer larger total volume when non-overlap estimate is ambiguous
        const volA = approximateTotalVolume(A)
        const volB = approximateTotalVolume(B)
        if (Math.abs(volA - volB) > eps) {
          const winner = volA > volB ? A : B
          priorities.set(winner.id, (priorities.get(winner.id) || 0) + 1)
          continue
        }
        // Tie-break: lower Y wins; then lower X; then lower Z
        const cA = getWorldCenter(A)
        const cB = getWorldCenter(B)
        let winner = null
        if (Math.abs(cA.y - cB.y) > 1e-6) winner = (cA.y < cB.y) ? A : B
        else if (Math.abs(cA.x - cB.x) > 1e-6) winner = (cA.x < cB.x) ? A : B
        else winner = (cA.z < cB.z) ? A : B
        priorities.set(winner.id, (priorities.get(winner.id) || 0) + 1)
      } else if (massA > massB) {
        priorities.set(A.id, (priorities.get(A.id) || 0) + 1)
      } else {
        priorities.set(B.id, (priorities.get(B.id) || 0) + 1)
      }
    }
  }

  // Order by descending score (higher score = stronger)
  const ordered = [...visible].sort((a, b) => (priorities.get(b.id) || 0) - (priorities.get(a.id) || 0))

  // Build rank mapping: 0 is strongest, increasing = weaker
  const rankEntries = ordered.map((o, idx) => [o.id, idx])
  const ranks = new Map(rankEntries)

  // Build per-object cutter list: higher-priority objects that intersect AABB
  const cuttersMap = new Map()
  for (let idx = 0; idx < ordered.length; idx++) {
    const obj = ordered[idx]
    const bbObj = computeObjectBBox(obj)
    const cutters = []
    for (let k = 0; k < idx; k++) {
      const cutter = ordered[k]
      const bbCut = computeObjectBBox(cutter)
      if (bbObj && bbCut && aabbsIntersect(bbObj, bbCut)) cutters.push(cutter)
    }
    cuttersMap.set(obj.id, cutters)
  }

  return { ordered, priorities, ranks, cuttersMap }
}


