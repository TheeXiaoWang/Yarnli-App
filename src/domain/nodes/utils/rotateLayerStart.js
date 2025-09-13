// Reorder nodes so index 0 starts at a consistent offset.
// offset is an integer index shift; positive rotates forward, negative backward.
export function rotateLayerStart(layerNodes, offset = 0) {
  const nodes = Array.isArray(layerNodes) ? layerNodes.slice() : []
  const n = nodes.length
  if (n === 0) return []
  const k = ((Math.round(offset) % n) + n) % n
  if (k === 0) return nodes
  return nodes.slice(k).concat(nodes.slice(0, k))
}


