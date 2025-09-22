import * as THREE from 'three'
import { ringMetricsAlongAxisFromPoints } from '../../domain/nodes/utils/radius'
import { polylineLength3D } from '../../domain/layerlines/circumference'
import { polylineLengthProjected } from '../../domain/layerlines/circumference'
import { buildScaffoldStep } from './buildStep'
import { resetTiltTrend } from '../nodes/buildNodes'
import { rotateLayerStart } from '../../domain/nodes/utils/rotateLayerStart'
import { STITCH_TYPES } from '../../constants/stitchTypes'


export function planScaffoldChain({ layers, startKey, centerV, axisDir, currentNodes, distributeNextNodes, countNextStitches, targetSpacing, increaseFactor = 1, decreaseFactor = 1, incMode = 'even', decMode = 'even', spacingMode = 'even', tiltScale = 1.0 }) {
  
  console.log('[ScaffoldPlanner v1] planning', { layers: layers?.length ?? 0 })
  const chainSegments = []
  const chainByLayer = []
  const childMaps = []
  const allNextRings = []
  let prev = currentNodes.map(n => ({ p: [...n.p] }))
  const epsKey = 1e-9
  const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z)
  if (n.lengthSq() < 1e-12) n.set(0,1,0)
  n.normalize()
  const axisOrigin = new THREE.Vector3(centerV.x, centerV.y, centerV.z).sub(n.clone().multiplyScalar(startKey))
  let lastYProcessed = null
  let globalMaxCircumference = 0

  // Persistent anchor and flip state across layers
  let lastAnchorNode0 = null // [x,y,z]
  let serpentineFlipState = false

  // Helper: visible perimeter from cut arcs (sum of open polylines)
  const totalVisibleLength = (layer) => {
    const polys = Array.isArray(layer?.polylines) ? layer.polylines : []
    if (!polys.length) return 0
    let sum = 0
    for (const poly of polys) sum += polylineLength3D(poly, false)
    return sum
  }

  // Helper function to detect if a layer is a cut layer (open polylines)
  const isCutLayer = (layer) => {
    return Array.isArray(layer?.polylines) && layer.polylines.length > 1
  }


  // Planner should not generate or mutate layer geometry here.


  // Helper: whether this object's end/start pole is intersected by another object
  const isPoleIntersected = (role) => {
    try {
      const poles = (window?.__LAYERLINE_MARKERS__?.poles || []).map((e) => (Array.isArray(e) ? { p: e } : e))
      const match = poles.find((p) => (p?.objectId === layer?.objectId) && (p?.role === role) && (p?.intersected === true))
      return !!match
    } catch (_) { return false }
  }

  // Helper function to get stitch type for first/last layers
  const getStitchType = (layer, isFirstLayer, isLastLayer) => {
    const isCut = isCutLayer(layer)
    if ((isFirstLayer || isLastLayer) && !isCut) {
      // If the corresponding pole is intersected by another object, use regular sc instead of edge
      if (isFirstLayer && isPoleIntersected('start')) return 'sc'
      if (isLastLayer && isPoleIntersected('end')) return 'sc'
      return 'edge'  // Use edge stitch type when not intersected
    }
    return 'sc'  // Default to single crochet
  }

  // Helper function to calculate actual yarn width based on stitch type
  // The yarn width represents spacing between stitches, not the size of the stitches
  // For smaller nodes, we want tighter spacing to create proper density
  const getYarnWidthForStitchType = (stitchType, baseYarnWidth) => {
    const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
    const widthMultiplier = stitchProfile.widthMul || 1.0
    // Spacing follows node width, scaled by a fixed packing factor
    const PF = 0.9
    return baseYarnWidth * widthMultiplier * PF
  }

  // Rotate nodes so that the entry closest to anchor becomes index 0
  const rotateToNearestAnchor = (nodes, anchor) => {
    if (!Array.isArray(nodes) || nodes.length === 0 || !Array.isArray(anchor) || anchor.length !== 3) return nodes
    let best = 0
    let bestD2 = Infinity
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i].p
      const dx = p[0] - anchor[0]
      const dy = p[1] - anchor[1]
      const dz = p[2] - anchor[2]
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < bestD2) { bestD2 = d2; best = i }
    }
    if (best === 0) return nodes
    return rotateLayerStart(nodes, best)
  }

  // Reassign ids to match array order (id 0 becomes first)
  const reassignIdsSequential = (nodes) => nodes.map((e, i) => ({ ...e, id: i }))

  // Pre-scan for global maximum circumference
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    let yTmp = Number(layer.y)
    const polyTmp = layer?.polylines?.[0]
    if (Array.isArray(polyTmp) && polyTmp.length > 0) {
      const mid = polyTmp[Math.floor(polyTmp.length / 2)]
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
        const delta = mv.clone().sub(centerV)
        yTmp = startKey + n.dot(delta)
      }
    }
    const centerAtTmp = axisOrigin.clone().add(n.clone().multiplyScalar(yTmp))
    const projectedCircTmp = Array.isArray(polyTmp) ? polylineLengthProjected(polyTmp, [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z], [n.x, n.y, n.z]) : 0
    const rTmp = projectedCircTmp > 0 ? (projectedCircTmp / (2 * Math.PI)) : (ringMetricsAlongAxisFromPoints(polyTmp || [], [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z], [n.x, n.y, n.z]).radius || 1)
    const L_vis_tmp = Array.isArray(layer?.polylines) && layer.polylines.length > 0 ? layer.polylines.reduce((s, p) => s + polylineLength3D(p, false), 0) : 0
    const circTmp = L_vis_tmp > 0 ? L_vis_tmp : (2 * Math.PI * Math.max(1e-9, rTmp))
    if (circTmp > globalMaxCircumference) globalMaxCircumference = circTmp
  }

  // Ensure layers are processed from the start pole toward the end pole.
  const orderedLayers = (() => {
    const out = []
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      let yTmp = Number(layer.y)
      const polyTmp = layer?.polylines?.[0]
      if (Array.isArray(polyTmp) && polyTmp.length > 0) {
        const mid = polyTmp[Math.floor(polyTmp.length / 2)]
        if (Array.isArray(mid) && mid.length === 3) {
          const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
          const delta = mv.clone().sub(centerV)
          yTmp = startKey + n.dot(delta)
        }
      }
      out.push({ layer, key: yTmp })
    }
    out.sort((a, b) => a.key - b.key)
    return out
  })()

  // Ensure first ring in this planning pass starts with positive tilt sign
  try { resetTiltTrend() } catch (_) {}

  for (let ringIndex = 0; ringIndex < orderedLayers.length; ringIndex++) {
    const layer = orderedLayers[ringIndex].layer
    const isFirstLayer = ringIndex === 0
    const isLastLayer = ringIndex === orderedLayers.length - 1
    
    // Use projection along normalized axis for ordering/param
    let yNext = Number(layer.y)
    const poly = layer?.polylines?.[0]
    if (Array.isArray(poly) && poly.length > 0) {
      const mid = poly[Math.floor(poly.length / 2)]
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2])
        const delta = mv.clone().sub(centerV)
        yNext = startKey + n.dot(delta)
      }
    }
    // Only skip a duplicate if it is exactly the same param-position as the last processed layer.
    // This avoids dropping distinct early layers that are very close to the start anchor.
    if (prev.length > 1 && lastYProcessed != null) {
      const nearLast = Math.abs(yNext - lastYProcessed) <= epsKey
      const nearStart = Math.abs(yNext - startKey) <= epsKey
      if (nearLast && nearStart) continue
    }
    const centerAt = axisOrigin.clone().add(n.clone().multiplyScalar(yNext))
    const projectedCirc = Array.isArray(poly) ? polylineLengthProjected(poly, [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]) : 0
    const rNext = projectedCirc > 0 ? (projectedCirc / (2 * Math.PI)) : (ringMetricsAlongAxisFromPoints(poly || [], [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z]).radius || 1)

    // Prefer true visible 3D length for cut layers; fallback to analytic circle when absent
    const L_vis = totalVisibleLength(layer)
    const fullCircle = 2 * Math.PI * Math.max(1e-9, rNext)
    let nextCircumference = L_vis > 0 ? L_vis : fullCircle
    
    // Do not override the last layer length; use the visible perimeter if present
    
    // DEV diagnostics: ensure visible perimeter is being used
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      try {
        if (Array.isArray(layer?.polylines) && layer.polylines.length > 0) {
          const sum = totalVisibleLength(layer)
          if (Math.abs(sum - nextCircumference) > 1e-6) {
            // eslint-disable-next-line no-console
            console.warn('[layer] L_vis mismatch', { sum, nextCircumference, y: yNext })
          }
        }
      } catch (_) {}
    }
    // derive stitch count to forward into distribution
    // Previous ring circumference using its centroid snapped onto axis
    let sx = 0, sy = 0, sz = 0
    for (const q of prev) { sx += q.p[0]; sy += q.p[1]; sz += q.p[2] }
    const centroidPrev = new THREE.Vector3(sx/Math.max(1,prev.length), sy/Math.max(1,prev.length), sz/Math.max(1,prev.length))
    const tPrev = n.dot(centroidPrev.clone().sub(axisOrigin))
    const centerPrev = axisOrigin.clone().add(n.clone().multiplyScalar(tPrev))
    const { circumference: curCirc } = ringMetricsAlongAxisFromPoints(prev.map(e => e.p), [centerPrev.x, centerPrev.y, centerPrev.z], [n.x, n.y, n.z])
    const nextCirc = 2 * Math.PI * rNext
    
    // Get stitch type for this layer
    const stitchType = getStitchType(layer, isFirstLayer, isLastLayer)
    
    // Calculate yarn width based on the actual stitch type that will be used
    const actualYarnWidth = getYarnWidthForStitchType(stitchType, targetSpacing)
    
    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: curCirc,
      nextCircumference: nextCircumference,
      yarnWidth: actualYarnWidth, // Use stitch type's actual width for proper spacing
      increaseFactor,
      decreaseFactor,
      spacingMode,
      incMode,
      decMode,
      seed: Math.floor(yNext * 1000),
    })

    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      try {
        if (nextCount <= 3 && nextCircumference > 3 * targetSpacing) {
          // eslint-disable-next-line no-console
          console.warn('[counts] suspiciously low nextCount for available length', {
            nextCount, nextCircumference, yarnWidth: targetSpacing, y: yNext,
          })
        }
      } catch (_) {}
    }

    const { segments, nextCurrentNodes, parentToChildren } = buildScaffoldStep({
      currentNodes: prev,
      layer,
      yNext,
      rNext,
      nextCount,
      center: [centerAt.x, centerAt.y, centerAt.z],
      sphereCenter: [centerV.x, centerV.y, centerV.z],
      maxCircumference: globalMaxCircumference,
      up: [n.x, n.y, n.z],
      distributeNextNodes,
      aRef: (typeof aRef !== 'undefined' ? aRef : null),
      yarnWidth: actualYarnWidth, // Use stitch type's actual width for proper distribution
      stitchType: stitchType, // This will handle the visual size difference
      tiltScale: Number(tiltScale) || 1.0,
    })

    // Cross-layer anchoring and serpentine flipping
    let adjusted = Array.isArray(nextCurrentNodes) ? nextCurrentNodes.slice() : []
    const isOpen = Array.isArray(layer?.polylines) && layer.polylines.length > 1
    if (isOpen) {
      // For open arcs: apply cross-layer flip first, then rotate to previous anchor
      if (serpentineFlipState) adjusted = adjusted.slice().reverse()
      if (lastAnchorNode0) adjusted = rotateToNearestAnchor(adjusted, lastAnchorNode0)
      serpentineFlipState = !serpentineFlipState
    } else {
      // Closed ring: rotate to previous anchor if available and reset flip state
      if (lastAnchorNode0) adjusted = rotateToNearestAnchor(adjusted, lastAnchorNode0)
      serpentineFlipState = false
    }
    adjusted = reassignIdsSequential(adjusted)

    // Collapse near-duplicate micro-layers that produce a single node very close to previous ring
    const EPS_COLLAPSE = 1e-3
    const isDegenerateNearPrev = (
      (adjusted?.length || 0) <= 1 &&
      allNextRings.length > 0 &&
      Math.abs(yNext - allNextRings[allNextRings.length - 1].y) < EPS_COLLAPSE
    )
    if (isDegenerateNearPrev) {
      // eslint-disable-next-line no-console
      console.warn('[planScaffoldChain] skipped degenerate layer at y=', yNext)
      continue
    }

    chainSegments.push(...segments)
    chainByLayer.push({ y: yNext, segments })
    // Guard single-node maps unless they are not near-duplicates
    if ((adjusted?.length || 0) > 1) {
      const mapEntries = parentToChildren.map((arr, j) => ({ from: j, children: arr.slice() }))
      const maybeTypes = (segments && segments.types) || null
      childMaps.push({ y: yNext, fromCount: prev.length, toCount: adjusted.length, map: mapEntries, types: maybeTypes || undefined })
    }
    prev = adjusted
    lastYProcessed = yNext
    // Update anchor to this layer's node0
    if (adjusted && adjusted.length > 0) lastAnchorNode0 = adjusted[0].p.slice()

    // Populate per-layer node rings for visuals (counts, sliders)
    // Skip empty rings to avoid ghost layers and phantom stitches
    if (adjusted && adjusted.length > 0) {
      allNextRings.push({ y: yNext, nodes: adjusted, circumference: nextCircumference })
    } else {
      // eslint-disable-next-line no-console
      console.warn('[planScaffoldChain] skipped empty layer at y=', yNext)
    }
  }
  const firstNextNodesRing = allNextRings[0]?.nodes || []
  // Debug summary of single-node layers after collapse
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const bad = childMaps.filter((m) => m.toCount === 1)
    if (bad.length) {
      // eslint-disable-next-line no-console
      console.log('[warn] single-node layers:', bad.map((m) => m.y))
    }
  }
  return { chainSegments, chainByLayer, childMaps, allNextRings, firstNextNodesRing }
}


