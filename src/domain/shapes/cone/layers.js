import * as THREE from 'three'
import { buildObjectMatrix, createGeometryForType, stitchSegmentsToPolylines } from '../../layerlines/common'
import { computeStitchDimensions } from '../../layerlines/stitches'

export function generateConeLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const geometry = createGeometryForType('cone')
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox.clone().applyMatrix4(matrix)

  // Stitch dimensions and spacing
  const { height: stitchH } = computeStitchDimensions({
    sizeLevel: settings.yarnSizeLevel ?? 4,
    baseHeight: 1,
    baseWidth: 1,
  })
  const step = Math.max(stitchH, 0.0005)

  // For cones, the pole is the tip (local +Y after transform)
  const axisCol = new THREE.Vector3().setFromMatrixColumn(matrix, 1)
  const apexLocal = new THREE.Vector3(0, 1, 0)
  const apex = apexLocal.clone().applyMatrix4(matrix)
  const baseLocal = new THREE.Vector3(0, -1, 0)
  const base = baseLocal.clone().applyMatrix4(matrix)
  const dir = base.clone().sub(apex).normalize() // ensure axis points from apex → base
  const axisScale = axisCol.length()
  // Ensure at least one ring near the apex for typical yarn sizes
  const firstGap = Math.max(step * 0.75, axisScale * 0.05)
  const heightWorld = base.clone().sub(apex).length()
  // Exact-step spacing: shift start so last ring lands at base, keep step == yarn size
  const usable = Math.max(0, heightWorld - firstGap)
  let ringCount = Math.max(1, Math.min(maxLayers, Math.floor(usable / step)))
  // If the apex region would be left without a ring due to rounding, add one more
  if (ringCount >= 1 && (heightWorld - ringCount * step) < firstGap * 0.25) {
    ringCount = Math.min(maxLayers, ringCount + 1)
  }
  // Shift offset so t_i = offset + i*step and t_ringCount == heightWorld
  let offset = heightWorld - ringCount * step
  // Ensure offset respects minimal first gap; if not, reduce ringCount
  while (ringCount > 1 && offset < firstGap - 1e-6) {
    ringCount -= 1
    offset = heightWorld - ringCount * step
  }

  const layers = []
  let lastTAxis = 0
  for (let i = 1; i <= ringCount; i++) {
    let tAxis = offset + i * step // world distance from apex along axis
    if (i === ringCount) tAxis = heightWorld // snap last ring to base edge
    if (tAxis > heightWorld + 1e-6) break
    const center = apex.clone().add(dir.clone().multiplyScalar(tAxis))
    // Local radius at this axis distance: in unit cone r_local = d/2 where d=axis distance in local
    const axisScale = new THREE.Vector3().setFromMatrixColumn(matrix, 1).length()
    const rLocal = (tAxis / Math.max(axisScale, 1e-9)) / 2
    if (rLocal <= 0) continue
    // Build ellipse axes in plane perpendicular to dir using transformed X/Z columns
    const c0 = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
    const c2 = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
    const proj = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    let u = proj(c0); let v = proj(c2)
    const a = u.length(); const b = v.length()
    if (a < 1e-9 && b < 1e-9) continue
    if (a < 1e-9) { u = v.clone().normalize(); v = new THREE.Vector3().crossVectors(dir, u); }
    else { u.normalize(); if (b < 1e-9) v = new THREE.Vector3().crossVectors(dir, u); else v.normalize() }
    const segments = 128
    const eps = Math.max(0.0015 * (axisScale + a + b), 0.001)
    const ring = []
    for (let s = 0; s < segments; s++) {
      const ang = (s / segments) * Math.PI * 2
      const p = center.clone()
        .add(u.clone().multiplyScalar(rLocal * a * Math.cos(ang)))
        .add(v.clone().multiplyScalar(rLocal * b * Math.sin(ang)))
      // push slightly outward along radial direction in the plane
      const radial = p.clone().sub(center)
      if (radial.lengthSq() > 1e-12) p.add(radial.normalize().multiplyScalar(eps))
      ring.push([p.x, p.y, p.z])
    }
    ring.push([...ring[0]])
    layers.push({ y: center.dot(dir), polylines: [ring], debugSource: { file: 'src/layerlines/cone.js', fn: 'generateConeLayers', kind: 'cone-ring', i } })
    lastTAxis = tAxis
  }
  // Removed forced base corner and base cap layers; spacing is adjusted slightly so last ring naturally
  // lands near the base with even spacing according to yarn size.

  // Base face concentric rings: continue spacing on the disk inward from the rim
  {
    const c0b = new THREE.Vector3().setFromMatrixColumn(matrix, 0)
    const c2b = new THREE.Vector3().setFromMatrixColumn(matrix, 2)
    const projB = (v) => v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)))
    let ub = projB(c0b); let vb = projB(c2b)
    let aRim = ub.length(); let bRim = vb.length()
    if (aRim > 1e-9 || bRim > 1e-9) {
      if (aRim < 1e-9) { ub = vb.clone().normalize(); vb = new THREE.Vector3().crossVectors(dir, ub); aRim = ub.length(); bRim = vb.length() }
      else { ub.normalize(); if (bRim < 1e-9) { vb = new THREE.Vector3().crossVectors(dir, ub); bRim = vb.length() } else vb.normalize() }
      const centerBase = base.clone()
      const segments = 128
      for (let n = 1; ; n++) { // start at 1 to avoid duplicating the rim ring
        const aN = aRim - n * step
        const bN = bRim - n * step
        if (aN <= 1e-6 || bN <= 1e-6) break
        const ring = []
        for (let s = 0; s < segments; s++) {
          const ang = (s / segments) * Math.PI * 2
          const p = centerBase.clone()
            .add(ub.clone().multiplyScalar(aN * Math.cos(ang)))
            .add(vb.clone().multiplyScalar(bN * Math.sin(ang)))
          ring.push([p.x, p.y, p.z])
        }
        ring.push([...ring[0]])
        layers.push({ y: centerBase.dot(dir), polylines: [ring], debugSource: { file: 'src/layerlines/cone.js', fn: 'generateConeLayers', kind: 'cone-base', n } })
      }
    }
  }

  // Markers: apex and base poles
  const markers = { poles: [[apex.x, apex.y, apex.z], [base.x, base.y, base.z]], ring0: [] }
  if (layers.length > 0 && layers[0].polylines.length > 0) {
    // take the longest polyline as the main ring
    const ring = layers[0].polylines.reduce((a, b) => (b.length > a.length ? b : a))
    markers.ring0.push(ring)
  }

  return { layers, markers }
}
