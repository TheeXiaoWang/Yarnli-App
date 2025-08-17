export function filterMeasurableLayers(layers, opts = {}) {
  const allowLooseFirst = !!opts.allowLooseFirst
  const forceIncludeIndex = Number.isInteger(opts.forceIncludeIndex) ? opts.forceIncludeIndex : -1
  const out = []
  const arr = layers || []
  for (let i = 0; i < arr.length; i++) {
    const l = arr[i]
    if (l?.debugSource?.kind === 'oval-chain-start') continue
    const len = Array.isArray(l?.polylines?.[0]) ? l.polylines[0].length : 0
    if (len >= 4) { out.push(l); continue }
    if ((allowLooseFirst && i === 0 && len >= 2) || (i === forceIncludeIndex && len >= 2)) { out.push(l); continue }
  }
  return out
}


