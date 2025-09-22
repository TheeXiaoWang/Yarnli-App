// Node mapping utilities (not scaffold-specific)
// Moved from scaffoldPlanning/helpers to keep concerns separated

import { mapBucketsMonotonic as _mapBucketsMonotonic } from '../../domain/nodes/transitions/mapBuckets'

// Simple linear, non-wrapping mapping (used for open arcs / cut rings)
export const mapBucketsLinear = (m, n) => {
  const result = Array.from({ length: m }, () => [])
  if (m === 0 || n === 0) return result
  if (n >= m) {
    const maxBranches = 2
    for (let j = 0; j < m; j++) {
      const kStart = Math.round((j * n) / m)
      let kEnd = Math.max(kStart, Math.round(((j + 1) * n) / m) - 1)
      kEnd = Math.min(kStart + (maxBranches - 1), kEnd)
      for (let k = kStart; k <= kEnd && k < n; k++) result[j].push(k)
    }
    return result
  }
  // decreases: quota without wrap
  const merges = m - n
  const quota = new Array(n).fill(1)
  const pickEvenSlots = (N, K) => {
    if (K <= 0) return []
    const sel = []
    const step = N / K
    let acc = 0
    for (let i = 0; i < K; i++) { sel.push(Math.floor(acc)); acc += step }
    const used = new Set()
    for (let i = 0; i < sel.length; i++) { let j = sel[i]; while (used.has(j) && j < N - 1) j++; sel[i] = Math.min(j, N - 1); used.add(sel[i]) }
    return sel.sort((a, b) => a - b)
  }
  for (const idx of pickEvenSlots(n, merges)) quota[idx] = 2
  let c = 0
  for (let p = 0; p < m; p++) {
    while (c < n && quota[c] === 0) c++
    if (c >= n) c = n - 1
    result[p].push(c)
    quota[c]--
    if (quota[c] === 0 && c < n - 1) c++
  }
  return result
}

// Allocate per-arc counts proportionally (min 1 for non-trivial arcs)
export const allocateCountsMin1 = (totalN, lengths, stitchW) => {
  const sum = Math.max(1e-12, lengths.reduce((a, b) => a + b, 0))
  const raw = lengths.map((L) => (L / sum) * totalN)
  const base = raw.map(Math.floor)
  let left = totalN - base.reduce((a, b) => a + b, 0)

  // Enforce min 1 for non-trivial arcs (length ≥ stitchW)
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] >= stitchW && base[i] === 0) { base[i] = 1; left -= 1 }
  }

  // Borrow back if overshot
  if (left < 0) {
    const borrow = raw.map((r, i) => ({ i, surplus: (base[i] - r) }))
      .sort((a, b) => b.surplus - a.surplus)
    let idx = 0
    while (left < 0 && idx < borrow.length) {
      const j = borrow[idx].i
      if (base[j] > 1) { base[j] -= 1; left += 1 } else idx++
    }
  }

  // Distribute remaining positive leftover by fractional part
  if (left > 0) {
    const rem = raw.map((r, i) => ({ i, frac: r - base[i] })).sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < left; k++) base[rem[k % rem.length].i]++
  }

  return base
}

// Thin wrapper, exported to keep import surface consistent
export const mapBucketsMonotonic = (currentNodes, nextNodes) => _mapBucketsMonotonic(currentNodes, nextNodes)


