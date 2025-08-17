export function formatPoleLabel(rank, volume, role) {
  const r = typeof rank === 'number' ? rank : 0
  const v = (typeof volume === 'number') ? ` • V:${volume.toFixed(2)}` : ''
  const tag = role === 'start' ? 'S' : role === 'end' ? 'E' : ''
  return `P${r}${tag ? ` ${tag}` : ''}${v}`
}


