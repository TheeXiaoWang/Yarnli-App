import * as THREE from 'three'
import { buildObjectMatrix, createGeometryForType, stitchSegmentsToPolylines, getWidestAxis, worldPlaneForAxis, sliceGeometryByPlane } from '../../layerlines/common'

export function generateTriangleLayers(object, settings, maxLayers) {
  const matrix = buildObjectMatrix(object)
  const geometry = createGeometryForType('triangle')
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox.clone().applyMatrix4(matrix)

  const s = Math.max(settings.stitchSize || settings.layerHeight || 0.2, 0.01)
  const axis = getWidestAxis(object)
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  // oriented direction
  const dir = new THREE.Vector3().setFromMatrixColumn(matrix, axisIndex).normalize()
  const center = new THREE.Vector3().setFromMatrixPosition(matrix)
  const minCoord = bb.min.clone().sub(center).dot(dir) + center.dot(dir)
  const maxCoord = bb.max.clone().sub(center).dot(dir) + center.dot(dir)
  const total = Math.min(maxLayers, Math.ceil((maxCoord - minCoord) / s))

  const layers = []
  for (let i = 0; i < total; i++) {
    const coord = minCoord + i * s
    const plane = new THREE.Plane(dir.clone(), -coord)
    const segs = (function sliceByPlane() {
      const pos = geometry.getAttribute('position')
      const index = geometry.getIndex()
      const getV = (ii) => new THREE.Vector3(pos.getX(ii), pos.getY(ii), pos.getZ(ii)).applyMatrix4(matrix)
      const segments = []
      const triCount = index ? index.count / 3 : pos.count / 3
      for (let t = 0; t < triCount; t++) {
        const i0 = index ? index.getX(t * 3 + 0) : t * 3 + 0
        const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
        const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2
        const p0 = getV(i0), p1 = getV(i1), p2 = getV(i2)
        const d0 = plane.distanceToPoint(p0)
        const d1 = plane.distanceToPoint(p1)
        const d2 = plane.distanceToPoint(p2)
        const pts = []
        const add = (a, da, b, db) => {
          const denom = da - db
          if (Math.abs(denom) < 1e-4) return
          const t2 = da / (da - db)
          if (t2 <= -1e-4 || t2 >= 1 + 1e-4) return
          pts.push(new THREE.Vector3().copy(a).lerp(b, t2))
        }
        const s0 = Math.sign(d0), s1 = Math.sign(d1), s2 = Math.sign(d2)
        if ((s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0)) continue
        add(p0, d0, p1, d1)
        add(p1, d1, p2, d2)
        add(p2, d2, p0, d0)
        if (pts.length === 2) segments.push([pts[0], pts[1]])
      }
      return segments
    })()
    const polys = stitchSegmentsToPolylines(segs)
    if (polys.length) layers.push({ y: coord, polylines: polys })
  }

  return { layers, markers: { poles: [], ring0: [] } }
}


