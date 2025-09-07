export function groupLayersByObject(labeledLayers) {
  const perObject = new Map()
  for (const layer of labeledLayers) {
    const id = layer.objectId ?? 'unknown'
    if (!perObject.has(id)) perObject.set(id, [])
    perObject.get(id).push(layer)
  }
  return perObject
}

export function buildObjectPolesAndAxes(markers) {
  const poleByObject = new Map()
  const axisByObject = new Map()
  if (markers?.poles) {
    for (const entry of markers.poles) {
      const pos = Array.isArray(entry) ? entry : (entry?.p || entry?.pos)
      const objectId = Array.isArray(entry) ? 'unknown' : (entry?.objectId ?? 'unknown')
      const role = Array.isArray(entry) ? undefined : entry?.role
      if (!pos) continue
      if (!poleByObject.has(objectId)) poleByObject.set(objectId, [])
      poleByObject.get(objectId).push({ pos, role })
    }
  }
  return { poleByObject, axisByObject }
}


