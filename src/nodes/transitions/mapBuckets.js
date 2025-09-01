// Monotonic parent→children mapping using proportional buckets (increases)
// and quota-consumption (decreases)
// - Parents: array of { p:[x,y,z] }
// - Next: array of { p:[x,y,z] }
// Returns: { segments: Array<[a,b]>, map: Array<{ from:number, children:number[] }>, status?: string }

function pickEvenSlots(N, K, offset = 0) {
  if (K <= 0) return []
  const sel = []
  let acc = ((offset % N) + N) % N
  const step = N / K
  for (let i = 0; i < K; i++) { sel.push(Math.floor(acc) % N); acc += step }
  const used = new Set()
  for (let i = 0; i < sel.length; i++) {
    let j = sel[i] % N
    while (used.has(j)) j = (j + 1) % N
    sel[i] = j; used.add(j)
  }
  return sel.sort((a, b) => a - b)
}

export function mapBucketsMonotonic(currentNodes, nextNodes) {
  const curN = (currentNodes || []).length
  const nxtN = (nextNodes || []).length
  const segments = []
  const map = new Array(curN).fill(null).map(() => ({ children: [] }))
  if (curN === 0 || nxtN === 0) return { segments, map: map.map((_, i) => ({ from: i, children: [] })) }

  // ===== INCREASES: keep original boundary logic (1→2) =====
  if (nxtN >= curN) {
    const maxBranches = 2
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

  // ===== DECREASES: quota-consumption (2→1), evenly spaced merges =====
  const m = curN, n = nxtN

  // Guard: impossible to keep degree ≤ 2
  if (m > 2 * n) {
    return { segments: [], map: [], status: 'need_split_prev' }
  }

  // 1) child quotas: start at 1 each; choose (m - n) children to have +1 (spread evenly)
  const merges = m - n
  const quota = new Array(n).fill(1)
  const twos = pickEvenSlots(n, merges, 0)
  for (const idx of twos) quota[idx] = 2

  // 2) Walk parents and consume quotas, WRAPPING around the ring until we find quota>0
  let c = 0
  for (let p = 0; p < m; p++) {
    let hops = 0
    while (quota[c] === 0 && hops < n) { c = (c + 1) % n; hops++ }
    if (hops === n) {
      return { segments, map: map.map((e, i) => ({ from: i, children: e.children })), status: 'quota_exhausted' }
    }

    segments.push([currentNodes[p].p, nextNodes[c].p])
    map[p].children.push(c)
    quota[c]--

    if (quota[c] === 0) c = (c + 1) % n
  }

  // DEV sanity (keep)
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const deg = new Array(n).fill(0)
    for (let p = 0; p < m; p++) for (const k of map[p].children) deg[k]++
    const ok = deg.every(d => d === 1 || d === 2) && deg.filter(d => d === 2).length === merges
    if (!ok) console.warn('[mapBucketsMonotonic/decrease] invariant failed', { m, n, merges, deg })
  }

  return { segments, map: map.map((e, i) => ({ from: i, children: e.children })) }
}


