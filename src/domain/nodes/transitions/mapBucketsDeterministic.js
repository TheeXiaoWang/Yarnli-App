export function mapBucketsDeterministic(curNodes, nxtNodes, opts = {}) {
  const cur = (curNodes || []).length
  const nxt = (nxtNodes || []).length

  const map = []
  const types = []

  if (cur === 0 || nxt === 0) {
    return { segments: [], map: [], types: [] }
  }

  if (cur === nxt) {
    for (let i = 0; i < cur; i++) {
      map.push({ from: i, children: [i] })
      types.push('sc')
    }
  } else if (nxt > cur) {
    const boundaries = []
    for (let j = 0; j <= cur; j++) boundaries.push(Math.round((j * nxt) / cur))
    for (let j = 0; j < cur; j++) {
      const kids = []
      for (let k = boundaries[j]; k < boundaries[j + 1]; k++) kids.push(k)
      map.push({ from: j, children: kids })
      types.push(kids.length > 1 ? 'inc' : 'sc')
    }
  } else {
    for (let j = 0; j < cur; j++) {
      const child = Math.floor((j * nxt) / cur)
      map.push({ from: j, children: [child] })
    }
    const childCounts = Array(nxt).fill(0)
    for (const r of map) for (const c of r.children) childCounts[c]++
    for (let i = 0; i < map.length; i++) {
      const child = map[i].children[0]
      types[i] = childCounts[child] > 1 ? 'dec' : 'sc'
    }
  }

  // Build segments for visuals on demand
  const segments = []
  for (const entry of map) {
    const fromP = curNodes[entry.from]?.p
    if (!fromP) continue
    for (const c of entry.children) {
      const toP = nxtNodes[c]?.p
      if (toP) segments.push([fromP, toP])
    }
  }

  return { segments, map, types }
}


