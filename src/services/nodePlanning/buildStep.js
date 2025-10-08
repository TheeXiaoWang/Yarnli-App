import * as THREE from 'three'
import { countNextStitches } from '../../domain/nodes/transitions/countNextStitches'
import { distributeNextNodes } from '../../domain/nodes/transitions/distributeNextNodes'
import { mapBucketsMonotonic } from '../../domain/nodes/transitions/mapBuckets'
// TODO: Restore scaffold.js - temporarily commented out during restructuring
// import { enforceStepContinuity } from '../../domain/nodes/utils/scaffold'
import { nearestPointOnPolyline } from '../../ui/editor/measurements/utils'

export function buildStep({ layer, currentNodes, currentRadius, centerV, axisDir, spacingParams, alignByAzimuth, metaCenterArr, handedness, prevSegments = null }) {
  const yNext = Number(layer.y)
  // Estimate next radius from polyline
  const poly = layer?.polylines?.[0]
  let rNext = currentRadius
  if (Array.isArray(poly) && poly.length > 0) {
    let sum = 0
    for (const p of poly) {
      const v = new THREE.Vector3(p[0], p[1], p[2])
      sum += v.distanceTo(centerV)
    }
    rNext = sum / poly.length
  }

  const curCirc = 2 * Math.PI * currentRadius
  const nextCirc = 2 * Math.PI * rNext
  const { nextCount: Nnext, plan } = countNextStitches({
    currentCount: currentNodes.length,
    currentCircumference: curCirc,
    nextCircumference: nextCirc,
    yarnWidth: spacingParams.targetSpacing,
    increaseFactor: spacingParams.increaseFactor,
    decreaseFactor: spacingParams.decreaseFactor,
    spacingMode: spacingParams.spacingMode,
    incMode: spacingParams.incMode,
    decMode: spacingParams.decMode,
    seed: Math.floor(yNext * 1000),
  })

  let { nodes: nextRing } = distributeNextNodes({ yNext, rNext, nextCount: Nnext, center: metaCenterArr, up: [axisDir.x, axisDir.y, axisDir.z], handedness })
  if (currentNodes && currentNodes.length > 0 && nextRing && nextRing.length > 0 && typeof alignByAzimuth === 'function') {
    const aligned = alignByAzimuth(currentNodes.map(n => n.p), nextRing.map(n => n.p), metaCenterArr)
    nextRing = aligned.map(p => ({ p }))
  }

  const { segments: mapped, map: childMap } = mapBucketsMonotonic(currentNodes, nextRing)
  // TODO: Restore enforceStepContinuity - temporarily using mapped directly
  // const contiguous = enforceStepContinuity(prevSegments, mapped)
  const contiguous = mapped // Temporary fallback
  const snapped = (layer?.polylines?.[0])
    ? contiguous.map(([a,b]) => {
        const vec = new THREE.Vector3(b[0], b[1], b[2])
        const hit = nearestPointOnPolyline(layer, vec) || vec
        return [a, [hit.x, hit.y, hit.z]]
      })
    : contiguous

  // For cones and tilted objects, tiny numerical differences along the axis can
  // zero-out when rings are very close. Do not drop segments by axial delta here.
  // Keep all contiguous segments and let downstream logic handle degenerate cases.
  let interLayer = (snapped || [])

  // Sanity: if shrank, keep <=1 per parent
  if (nextRing.length <= currentNodes.length) {
    const counts = new Array(currentNodes.length).fill(0)
    for (const [a] of interLayer) {
      let idx = -1
      for (let j = 0; j < currentNodes.length; j++) {
        const p = currentNodes[j].p
        if (p[0] === a[0] && p[1] === a[1] && p[2] === a[2]) { idx = j; break }
      }
      if (idx >= 0) counts[idx]++
    }
    interLayer = interLayer.filter(([a]) => {
      let idx = -1
      for (let j = 0; j < currentNodes.length; j++) {
        const p = currentNodes[j].p
        if (p[0] === a[0] && p[1] === a[1] && p[2] === a[2]) { idx = j; break }
      }
      if (idx < 0) return true
      if (counts[idx] <= 1) return true
      counts[idx]--
      return false
    })
  }

  const nextCurrent = interLayer.map(seg => ({ p: seg[1] }))

  // spacing
  let spacing = 0
  if (nextRing && nextRing.length > 1) {
    let total = 0
    for (let i = 0; i < nextRing.length; i++) {
      const a = nextRing[i].p
      const b = nextRing[(i+1) % nextRing.length].p
      total += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2])
    }
    spacing = total / nextRing.length
  }

  const incs = (plan || []).filter(a => a === 'inc').length
  const decs = (plan || []).filter(a => a === 'dec').length

  return { segments: interLayer, nextCurrentNodes: nextCurrent, nextRing, incs, decs, spacing, childMap }
}


