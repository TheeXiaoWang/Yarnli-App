// Monotonic parent→children mapping with closed vs open handling
// - Parents: array of { p:[x,y,z], arc?:number }
// - Next: array of { p:[x,y,z], arc?:number }
// Returns: { segments: Array<[a,b]>, map: Array<{ from:number, children:number[] }> }

function dist2(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

// Helper: assign quotas per parent based on target ratio and neighbor gaps
function computeQuotas(m, n, currentNodes) {
  const target = n / Math.max(1, m)
  const base = Math.floor(target)
  const quotas = new Array(m).fill(base)
  let remainder = n - base * m

  // Give extra +1 to parents with largest neighbor gaps
  const gaps = new Array(m).fill(0)
  for (let i = 0; i < m; i++) {
    const a = currentNodes[i].p
    const b = currentNodes[(i + 1) % m].p
    gaps[i] = Math.sqrt(dist2(a, b))
  }
  const order = Array.from({ length: m }, (_, i) => i).sort((i, j) => gaps[j] - gaps[i])
  let oi = 0
  while (remainder > 0 && oi < order.length) {
    quotas[order[oi]]++
    remainder--
    oi++
  }
  return quotas
}

import { mapBucketsDeterministic } from './mapBucketsDeterministic'

function useDeterministicFlag() {
  try {
    if (typeof window !== 'undefined' && typeof window.__USE_DETERMINISTIC__ === 'boolean') return window.__USE_DETERMINISTIC__
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.VITE_USE_DETERMINISTIC !== 'undefined') {
      const v = import.meta.env.VITE_USE_DETERMINISTIC
      if (v === 'false' || v === false) return false
      if (v === 'true' || v === true) return true
    }
  } catch(_) {}
  return true
}

function mapBucketsOpen(currentNodes, nextNodes) {
  const m = (currentNodes || []).length
  const n = (nextNodes || []).length
  const segments = []
  const map = new Array(m).fill(null).map(() => ({ children: [] }))
  if (m === 0 || n === 0) return { segments, map: map.map((_, i) => ({ from: i, children: [] })) }

  // --- group children by arcId (null/undefined ⇒ one group key -1) ---
  const groups = new Map()
  for (let j = 0; j < n; j++) {
    const arc = (nextNodes[j].arc ?? -1)
    if (!groups.has(arc)) groups.set(arc, [])
    groups.get(arc).push({ idx: j, p: nextNodes[j].p })
  }

  // Sort children in each arc sequentially (left→right by X, fallback Y)
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      if (Math.abs(a.p[0] - b.p[0]) > 1e-6) return a.p[0] - b.p[0]
      return a.p[1] - b.p[1]
    })
  }

  // Precompute per-arc max reach (avg spacing * factor)
  const arcStats = new Map() // arcId -> { maxReach2 }
  for (const [arcId, arr] of groups.entries()) {
    const pts = arr.map(e => e.p)
    let L = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0]
      const dy = pts[i + 1][1] - pts[i][1]
      const dz = pts[i + 1][2] - pts[i][2]
      L += Math.hypot(dx, dy, dz)
    }
    const avg = L / Math.max(1, arr.length)
    const maxReach = 1.5 * avg
    arcStats.set(arcId, { maxReach2: maxReach * maxReach })
  }
  const withinReach = (parent, child, arcId) => {
    const s = arcStats.get(arcId ?? -1) || { maxReach2: Infinity }
    return dist2(parent.p, child.p) <= s.maxReach2
  }

  // Deterministic index-driven mapping for open arcs (no wrap)
  const det = mapBucketsDeterministic(currentNodes, nextNodes)
  return { segments: det.segments || [], map: det.map, types: det.types }
}

function mapBucketsClosedLegacy(currentNodes, nextNodes) {
  const curN = (currentNodes || []).length
  const nxtN = (nextNodes || []).length
  const segments = []
  const map = new Array(curN).fill(null).map(() => ({ children: [] }))
  if (curN === 0 || nxtN === 0) return { segments, map: map.map((_, i) => ({ from: i, children: [] })) }

  // Increases: boundary mapping with optional 2 branches per parent (single parent can branch to all)
  if (nxtN >= curN) {
    const isSingleParent = curN === 1
    const maxBranches = isSingleParent ? nxtN : 2
    const boundary = []
    for (let j = 0; j <= curN; j++) boundary[j] = Math.round((j * nxtN) / curN)
    for (let j = 0; j < curN; j++) {
      const kStart = boundary[j]
      const kEndRaw = boundary[j + 1]
      let kEnd = Math.max(kStart, kEndRaw - 1)
      kEnd = Math.min(kStart + (maxBranches - 1), kEnd)
      for (let k = kStart; k <= kEnd && k < nxtN; k++) {
        segments.push([currentNodes[j].p, nextNodes[k].p])
        map[j].children.push(k)
      }
      map[j].children = Array.from(new Set(map[j].children)).sort((a, b) => a - b)
    }
    return { segments, map: map.map((e, i) => ({ from: i, children: e.children })) }
  }

  // Decreases: quota-consumption with wrap-around
  const m = curN, n = nxtN
  if (m > 2 * n) {
    return { segments: [], map: [], status: 'need_split_prev' }
  }
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
    let hops = 0
    while (quota[c] === 0 && hops < n) { c = (c + 1) % n; hops++ }
    if (hops === n) return { segments, map: map.map((e, i) => ({ from: i, children: e.children })), status: 'quota_exhausted' }
    segments.push([currentNodes[p].p, nextNodes[c].p])
    map[p].children.push(c)
    quota[c]--
    if (quota[c] === 0) c = (c + 1) % n
  }
  return { segments, map: map.map((e, i) => ({ from: i, children: e.children })) }
}

function mapBucketsClosed(currentNodes, nextNodes) {
  const useDet = useDeterministicFlag()
  if (!useDet) return mapBucketsClosedLegacy(currentNodes, nextNodes)
  const det = mapBucketsDeterministic(currentNodes, nextNodes)
  return { segments: det.segments || [], map: det.map, types: det.types }
}

export function mapBucketsMonotonic(currentNodes, nextNodes) {
  const n = (nextNodes || []).length
  const isClosedRing = (n > 0) && (nextNodes.every((x) => x.arc == null) || (new Set(nextNodes.map((x) => x.arc ?? -1)).size <= 1))
  if (isClosedRing) return mapBucketsClosed(currentNodes, nextNodes)
  return mapBucketsOpen(currentNodes, nextNodes)
}


