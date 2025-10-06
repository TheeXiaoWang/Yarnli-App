import * as THREE from 'three'
import { buildBaselineSegments } from './pipes/baseline'
import { filterMeasurableLayers } from './filters/layers'
import { computePerObjectLayerOrder } from './utils/layerOrdering.js'

// Build measurement segments from layers and markers, per object.
// Each segment: { objectId, label, value, a:[x,y,z], b:[x,y,z] }
export function computeMeasurementSegments(layers, markers, measureEvery = 1, opts = {}) {
  // Build a shared per-object ordering consistent with the overlay
  const { idxMap } = computePerObjectLayerOrder(layers || [], markers || {})
  const perObject = new Map()
  for (const layer of (layers || [])) {
    if (!idxMap.has(layer)) continue // skip helpers/non-renderable
    const id = layer.objectId ?? 'unknown'
    if (!perObject.has(id)) perObject.set(id, [])
    perObject.get(id).push(layer)
  }

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
    poleByObject.forEach((arr, id) => {
      if (arr.length >= 1) {
        // Prefer roles if present to determine axis direction
        const startPos = (arr.find(e => e.role === 'start')?.pos) || arr[0].pos
        const endPos = (arr.find(e => e.role === 'end')?.pos) || (arr[1]?.pos || startPos)
        const a = vec(startPos)
        const b = vec(endPos)
        const axis = b.clone().sub(a)
        if (axis.lengthSq() > 0) axisByObject.set(id, axis.normalize())
      }
    })
  }

  const segments = []
  perObject.forEach((arr, id) => {
    // Respect per-object ordering from shared overlay logic
    const sorted = [...arr].sort((a, b) => (idxMap.get(a) ?? 0) - (idxMap.get(b) ?? 0))
    // Include ALL layers by default (including base layers) to match the index overlay
    const includeAll = (opts?.includeAllLayers !== undefined) ? !!opts.includeAllLayers : true
    const usable = includeAll
      ? sorted
      : filterMeasurableLayers(sorted, { allowLooseFirst: true, forceIncludeIndex: 0 })
    // Baseline: always use the simple baseline algorithm regardless of type
    // Rebuild poles ordered by role: [start, end]
    const arrPoles = poleByObject.get(id) || []
    const startPos = (arrPoles.find(e => e.role === 'start')?.pos) || (arrPoles[0]?.pos)
    const endPos = (arrPoles.find(e => e.role === 'end')?.pos) || (arrPoles[1]?.pos)
    const poles = [startPos, endPos].filter(Boolean)
    const axis = axisByObject.get(id) || (poles.length === 2 ? vec(poles[1]).sub(vec(poles[0])).normalize() : new THREE.Vector3(0,1,0))
    const type = usable[0]?.objectType || 'unknown'
    // Auto metric: project along axis for non-spheres; use true 3D for spheres
    const autoProject = (opts?.projectAlongAxis !== undefined) ? opts.projectAlongAxis : (type !== 'sphere')
    const localOpts = { ...opts, projectAlongAxis: autoProject, orderedAlready: true, strictAzimuth: true, idxMap }
    const segs = buildBaselineSegments(usable, poles, axis, measureEvery, localOpts)
    for (const s of segs) segments.push(s)
  })

  return segments
}

function vec(entry) {
  if (Array.isArray(entry)) return new THREE.Vector3(...entry)
  if (entry?.pos) return new THREE.Vector3(...entry.pos)
  if (entry?.p) return new THREE.Vector3(...entry.p)
  return new THREE.Vector3(0,0,0)
}

function seg(objectId, label, a, b, axis=null) {
  const value = axis ? Math.abs(axis.dot(b.clone().sub(a))) : a.distanceTo(b)
  return { objectId, label, value, a: [a.x,a.y,a.z], b: [b.x,b.y,b.z] }
}


