import * as THREE from 'three'
import { planScaffoldChain } from './planScaffoldChain'

// Plan scaffolding separately per objectId and return both per-object and flattened results
export function planScaffoldByObject({
  layers,
  startKey,
  centerV,
  axisDir,
  currentNodes, // optional global seed; per-object seed chosen from markers if available
  markers,
  distributeNextNodes,
  countNextStitches,
  targetSpacing,
  increaseFactor = 1,
  decreaseFactor = 1,
  incMode = 'even',
  decMode = 'even',
  spacingMode = 'even',
  handedness = 'right',
}) {
  const epsKey = 1e-6
  const byObject = new Map()
  // Group by objectId
  for (const l of (layers || [])) {
    const id = l?.objectId ?? 'unknown'
    if (!byObject.has(id)) byObject.set(id, [])
    byObject.get(id).push(l)
  }

  const perObject = []
  const flattened = {
    chainSegments: [],
    chainByLayer: [],
    childMaps: [],
    allNextRings: [],
    firstNextNodesRing: [],
  }

  const nGlobal = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z)
  if (nGlobal.lengthSq() < 1e-12) nGlobal.set(0, 1, 0)
  nGlobal.normalize()
  const axisOriginGlobal = new THREE.Vector3(centerV.x, centerV.y, centerV.z).sub(nGlobal.clone().multiplyScalar(startKey))

  for (const [objectId, arr] of byObject.entries()) {
    // Build keys
    // We'll determine a per-object axis and origin
    // Try to use the object's poles if available; otherwise fall back to global
    let startPos = null
    let endPos = null
    const polesAll = Array.isArray(markers?.poles) ? markers.poles : []
    for (const entry of polesAll) {
      const obj = Array.isArray(entry) ? { p: entry } : entry
      const oid = obj?.objectId ?? 'unknown'
      if (oid !== objectId) continue
      if ((obj?.role === 'start' || obj?.role === 'Start' || obj?.role === 'START') && Array.isArray(obj?.p) && obj.p.length === 3) {
        startPos = new THREE.Vector3(obj.p[0], obj.p[1], obj.p[2])
      }
      if ((obj?.role === 'end' || obj?.role === 'End' || obj?.role === 'END') && Array.isArray(obj?.p) && obj.p.length === 3) {
        endPos = new THREE.Vector3(obj.p[0], obj.p[1], obj.p[2])
      }
    }
    let nObj = nGlobal.clone()
    if (startPos && endPos) {
      nObj = endPos.clone().sub(startPos)
      if (nObj.lengthSq() > 1e-12) nObj.normalize(); else nObj.copy(nGlobal)
    }
    // Fallback origin at startPos if present; else use global axis origin
    let axisOrigin = startPos ? startPos.clone() : axisOriginGlobal.clone()

    const layersWithKey = arr.map((l) => {
      const poly = l?.polylines?.[0]
      let mid = null
      if (Array.isArray(poly) && poly.length > 0) mid = poly[Math.floor(poly.length / 2)]
      const v = mid ? new THREE.Vector3(mid[0], mid[1], mid[2]) : new THREE.Vector3(0, 0, 0)
      const key = nObj.dot(v.clone().sub(axisOrigin))
      return { layer: l, __key: key }
    })
    // Sort layers by closeness to global start key; will be used for fallback anchor and direction
    const byCloseness = layersWithKey
      .filter((e) => Number.isFinite(e.__key))
      .sort((a, b) => Math.abs(a.__key - startKey) - Math.abs(b.__key - startKey))
    if (!startPos) {
      const e0 = byCloseness[0]
      if (e0) {
        const poly0 = e0.layer?.polylines?.[0]
        const mid0 = Array.isArray(poly0) && poly0.length > 0 ? poly0[Math.floor(poly0.length / 2)] : null
        if (mid0) startPos = new THREE.Vector3(mid0[0], mid0[1], mid0[2])
      }
    }

    // Compute per-object startKey from chosen anchor
    let startKeyObj = 0
    if (!startPos) {
      // No explicit start pole; measure from current centerV to origin
      startKeyObj = nObj.dot(new THREE.Vector3(centerV.x, centerV.y, centerV.z).sub(axisOrigin))
    }
    // sign > 0 means we go toward increasing key; < 0 toward decreasing key
    let dirSign = 1
    if (startPos && endPos) {
      const signVal = nObj.dot(endPos.clone().sub(startPos))
      dirSign = signVal >= 0 ? 1 : -1
    } else {
      const nearest = byCloseness[0]
      if (nearest) dirSign = (nearest.__key - startKeyObj) >= 0 ? 1 : -1
    }
    // Build ordered list: take the closest 1–2 layers first (regardless of side),
    // then continue strictly forward toward the end pole. This ensures early rings
    // right above the start pole are not ignored at small yarn sizes.
    const finite = layersWithKey.filter((e) => Number.isFinite(e.__key))
    const nearSorted = finite.slice().sort((a, b) => Math.abs(a.__key - startKeyObj) - Math.abs(b.__key - startKeyObj))
    const head = []
    const used = new Set()
    for (let i = 0; i < nearSorted.length && head.length < 2; i++) {
      const e = nearSorted[i]
      head.push(e)
      used.add(e)
    }
    const forwardRest = finite
      .filter((e) => !used.has(e) && (e.__key - startKeyObj) * dirSign > epsKey)
      .sort((a, b) => (a.__key - b.__key) * dirSign)
    const layersToProcess = head.concat(forwardRest).map((e) => e.layer)
    if (layersToProcess.length === 0) continue
    // Seed from the object's start pole if available; otherwise nearest layer midpoint.
    let seedRing = (currentNodes || [])
    let centerVObj = centerV
    if (startPos) {
      seedRing = [ { p: [startPos.x, startPos.y, startPos.z] } ]
      centerVObj = startPos.clone()
    } else {
      const firstLayer = layersToProcess[0]
      const poly0 = firstLayer?.polylines?.[0]
      const mid0 = Array.isArray(poly0) && poly0.length > 0 ? poly0[Math.floor(poly0.length / 2)] : null
      if (mid0) {
        seedRing = [ { p: [mid0[0], mid0[1], mid0[2]] } ]
        centerVObj = new THREE.Vector3(mid0[0], mid0[1], mid0[2])
      }
    }

    // Build per-object absolute azimuth anchor aRef: start->end projected to ring plane
    let aRef = null
    if (startPos && endPos) {
      const nAxis = nObj
      const vec = endPos.clone().sub(startPos)
      const planeVec = vec.sub(nAxis.clone().multiplyScalar(vec.dot(nAxis)))
      if (planeVec.lengthSq() > 1e-12) aRef = [planeVec.x, planeVec.y, planeVec.z]
    }

    const result = planScaffoldChain({
      layers: layersToProcess,
      startKey: startKeyObj,
      centerV: centerVObj,
      axisDir: nObj,
      currentNodes: seedRing,
      distributeNextNodes: (args) => distributeNextNodes({ ...args, center: [centerVObj.x, centerVObj.y, centerVObj.z], up: [nObj.x, nObj.y, nObj.z], handedness }),
      countNextStitches,
      targetSpacing,
      increaseFactor,
      decreaseFactor,
      incMode,
      decMode,
      spacingMode,
    })
    // Inject anchor into each build step by passing through store-level distributeNextNodes wrapper
    // Not altering planScaffoldChain; it forwards the args into buildStep which accepts aRef
    // So we rebuild segments using the returned structure is not needed here.
    perObject.push({ objectId, ...result })
    // Flatten into global outputs for existing UI, but preserve objectId for filtering in the renderer
    flattened.chainSegments.push(...(result.chainSegments || []))
    flattened.chainByLayer.push(...(result.chainByLayer || []).map((e) => ({ ...e, objectId })))
    flattened.childMaps.push(...(result.childMaps || []).map((e) => ({ ...e, objectId })))
    flattened.allNextRings.push(...(result.allNextRings || []).map((e) => ({ ...e, objectId })))
    if (Array.isArray(result.firstNextNodesRing) && result.firstNextNodesRing.length > 0) {
      flattened.firstNextNodesRing.push(...result.firstNextNodesRing)
    }
  }

  return { perObject, ...flattened }
}


