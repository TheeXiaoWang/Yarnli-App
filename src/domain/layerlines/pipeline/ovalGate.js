import * as THREE from 'three'

// Fast axis-based ovality check: compares scales on orthogonal axes to the primary generation axis
export function isOvalByAxes(worldMat, dirKey, threshold = 1.1) {
  const col0 = new THREE.Vector3().setFromMatrixColumn(worldMat, 0)
  const col1 = new THREE.Vector3().setFromMatrixColumn(worldMat, 1)
  const col2 = new THREE.Vector3().setFromMatrixColumn(worldMat, 2)
  const n0 = col0.clone().normalize(), n1 = col1.clone().normalize(), n2 = col2.clone().normalize()
  const d0 = Math.abs(n0.dot(new THREE.Vector3(...dirKey)))
  const d1 = Math.abs(n1.dot(new THREE.Vector3(...dirKey)))
  const d2 = Math.abs(n2.dot(new THREE.Vector3(...dirKey)))
  let primary = 0
  if (d1 > d0 && d1 >= d2) primary = 1
  else if (d2 > d0 && d2 >= d1) primary = 2
  const lens = [col0.length(), col1.length(), col2.length()]
  const ortho = [0,1,2].filter(i => i !== primary)
  const a = lens[ortho[0]], b = lens[ortho[1]]
  const axesRatio = Math.max(a, b) / Math.max(1e-9, Math.min(a, b))
  return { isOval: axesRatio > threshold, axesRatio, primary }
}


