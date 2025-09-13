import * as THREE from 'three'

// Attach stable ordering keys for layers using the generation direction
export function annotateLayersWithKeys(layers, worldMat, dirHint) {
  const out = []
  const dirKey = new THREE.Vector3(dirHint?.[0] ?? 0, dirHint?.[1] ?? 0, dirHint?.[2] ?? 0)
  let dir = dirKey.clone()
  if (dir.length() < 1e-6) {
    const axisIdx = 1 // default Y
    dir = new THREE.Vector3().setFromMatrixColumn(worldMat, axisIdx)
  }
  dir.normalize()
  const origin = new THREE.Vector3().setFromMatrixPosition(worldMat)
  for (let idx = 0; idx < layers.length; idx++) {
    const l = layers[idx]
    const poly = l.polylines?.[0]
    let key = l.y
    if (poly && poly.length) {
      const mid = poly[Math.floor(poly.length / 2)]
      const p = new THREE.Vector3(...mid)
      key = dir.dot(p) - dir.dot(origin)
    }
    out.push({ ...l, _lid: idx, _keyAlongAxis: key })
  }
  return out
}


