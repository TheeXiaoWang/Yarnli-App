// Monotonic parent→children mapping using proportional buckets
// - Parents: array of { p:[x,y,z] }
// - Next: array of { p:[x,y,z] }
// - If nxt > cur → allow up to 2 children per parent; else max 1
// Returns: { segments: Array<[a,b]>, map: Array<{ from:number, children:number[] }> }

export function mapBuckets(currentNodes, nextNodes) {
  const curN = (currentNodes || []).length
  const nxtN = (nextNodes || []).length
  const segments = []
  const map = new Array(curN).fill(null).map(() => ({ children: [] }))
  if (curN === 0 || nxtN === 0) return { segments, map: map.map((e, i) => ({ from: i, children: [] })) }

  const isIncrease = nxtN > curN
  const maxBranches = isIncrease ? 2 : 1
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


