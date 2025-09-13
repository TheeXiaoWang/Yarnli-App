import React, { useCallback, useMemo } from 'react'
import { useSceneStore } from '../../app/stores/sceneStore'
import SceneObject from './SceneObject'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { useNodeStore } from '../../app/stores/nodeStore'
import LayerlineViewer from './LayerlineViewer'
import NodeViewer from './NodeViewer'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { polylineLengthProjected } from '../../domain/layerlines/circumference'

const Scene3D = () => {
  const { objects, selectedObject } = useSceneStore()
  const { generated, settings } = useLayerlineStore()
  const { nodes, scaffold, nextNodes, nextScaffold, nextPoints, nextLayersPoints, spacingPerLayer, transitionOps, chainScaffold, chainScaffoldByLayer, stitchCounts, scaffoldCenter, ui } = useNodeStore()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/primitive')
    if (!type) return
    // Use window.r3f root state if available to get camera
    const glCanvas = document.querySelector('canvas')
    const rect = glCanvas?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 1 }
    const xNdc = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const yNdc = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    const { getState } = require('@react-three/fiber')
    const state = getState?.()
    const camera = state?.camera
    if (!camera) { useSceneStore.getState().addObject(type, [0, 0, 0]); return }
    const origin = camera.position.clone()
    const dir = new THREE.Vector3(xNdc, yNdc, 0.5).unproject(camera).sub(origin).normalize()
    const t = -origin.y / Math.max(dir.y, 1e-6)
    const hit = origin.clone().add(dir.multiplyScalar(t))
    useSceneStore.getState().addObject(type, [hit.x, 0, hit.z])
  }, [])

  const handleDragOver = useCallback((e) => { e.preventDefault() }, [])

  // Projected axis for labeling (start->end pole or fallback to world Y)
  const { axisDir, axisOrigin, axisLen } = useMemo(() => {
    let dir = new THREE.Vector3(0, 1, 0)
    let origin = scaffoldCenter ? new THREE.Vector3(scaffoldCenter[0], scaffoldCenter[1], scaffoldCenter[2]) : new THREE.Vector3(0, 0, 0)
    let len = 1
    try {
      const selId = selectedObject?.id
      let poles = (useLayerlineStore.getState()?.generated?.markers?.poles || []).map((e) => Array.isArray(e) ? { p: e } : e)
      if (selId != null) poles = poles.filter((p) => (p?.objectId ?? null) === selId)
      const startP = poles.find((e) => e?.role === 'start')?.p || poles[0]?.p
      const endP = poles.find((e) => e?.role === 'end')?.p || poles[1]?.p
      if (startP && endP) {
        const a = new THREE.Vector3(startP[0], startP[1], startP[2])
        const b = new THREE.Vector3(endP[0], endP[1], endP[2])
        const delta = b.clone().sub(a)
        len = Math.max(1e-6, delta.length())
        dir = delta.normalize()
        if (dir.lengthSq() > 1e-12) dir.normalize()
        else dir.set(0, 1, 0)
        origin = a
      }
    } catch (_) {}
    return { axisDir: dir, axisOrigin: origin, axisLen: len }
  }, [scaffoldCenter, selectedObject?.id])

  return (
    <group onDrop={handleDrop} onDragOver={handleDragOver}>
      {/* Render all objects in the scene */}
      {objects.map((object) => (
        <SceneObject
          key={object.id}
          object={object}
          isSelected={selectedObject?.id === object.id}
        />
      ))}

      {/* Render generated layerlines */}
      <LayerlineViewer layers={generated.layers} color={settings.color} markers={generated.markers} meta={generated.meta} />

      {/* Render nodes/points cumulatively up to the selected layer */}
      {(ui?.showNodes || ui?.showNodePoints) && (() => {
        const vis = Math.max(0, ui?.nodeLayerVisibleCount || 0)
        const out = []
        if (nodes && Array.isArray(nodes.nodes)) {
          if (vis === 0) {
            const cap = Math.min(Math.max(1, ui?.nodeVisibleCount || 1), nodes.nodes.length)
            const sliced = { ...nodes, nodes: nodes.nodes.slice(0, cap) }
            out.push(<NodeViewer key={'mr'} nodeRing0={sliced} scaffold={{ segments: [] }} color={'#ffaa00'} showNodes={ui?.showNodes} showScaffold={false} showConnections={false} showPoints={ui?.showNodePoints} />)
          } else {
            // Always include full MR ring when showing later layers
            out.push(<NodeViewer key={'mr'} nodeRing0={nodes} scaffold={{ segments: [] }} color={'#ffaa00'} showNodes={ui?.showNodes} showScaffold={false} showConnections={false} showPoints={ui?.showNodePoints} />)
          }
        }
        const selId = selectedObject?.id
        const pointsFiltered = Array.isArray(nextLayersPoints)
          ? (selId != null ? nextLayersPoints.filter((e) => e.objectId === selId) : nextLayersPoints)
          : []
        if (vis > 0 && pointsFiltered.length > 0) {
          const upto = Math.min(vis, pointsFiltered.length)
          // Helper: find nearest generated layer polyline for given y
          const findLayerPolylineByY = (yTarget) => {
            try {
              const layers = Array.isArray(generated?.layers) ? generated.layers : []
              if (layers.length === 0) return null
              let best = null
              let bestD = Infinity
              for (const L of layers) {
                const d = Math.abs((L?.y ?? 0) - yTarget)
                if (d < bestD) { best = L; bestD = d }
              }
              const poly = best?.polylines?.[0]
              return Array.isArray(poly) && poly.length > 1 ? poly : null
            } catch (_) { return null }
          }

          for (let i = 0; i < upto; i++) {
            const ring = pointsFiltered[i]
            if (!ring || !Array.isArray(ring.nodes) || ring.nodes.length === 0) continue
            const cap = (i === upto - 1) ? Math.min(Math.max(1, ui?.nodeVisibleCount || 1), ring.nodes.length) : ring.nodes.length
            const nodesCapped = ring.nodes.slice(0, cap)
            const polyline = findLayerPolylineByY(ring.y)
            out.push(
              <NodeViewer
                key={`nx-ring-${i}`}
                nodeRing0={{
                  nodes: nodesCapped.map((n) => ({ id: n.id, p: n.p, tangent: n.tangent, normal: n.normal, theta: n.theta, quaternion: n.quaternion })),
                  meta: {
                    center: scaffoldCenter,
                    surfaceCenter: scaffoldCenter,
                    normal: [axisDir.x, axisDir.y, axisDir.z],
                    axisDir: [axisDir.x, axisDir.y, axisDir.z],
                    axisOrigin: [axisOrigin.x, axisOrigin.y, axisOrigin.z],
                    axisLen,
                    layerPolyline: polyline,
                    objectType: selectedObject?.type || null
                  }
                }}
                scaffold={{ segments: [] }}
                color={'#00aaff'}
                showNodes={ui?.showNodes}
                showScaffold={false}
                showPoints={ui?.showNodePoints}
                objectType={selectedObject?.type || null}
              />
            )
          }
        }
        return out.length > 0 ? <group>{out}</group> : null
      })()}

      {/* Render next-layer points (cyan) and scaffold if present */}
      {/* Hide the one-step preview nodes to avoid duplication; leave scaffold rendering only. */}
      {/* Removed nextScaffold rendering to avoid duplication with chainScaffold */}

      {/* Render point markers for all processed next layers when enabled */}
      {ui?.showNextPoints && Array.isArray(nextLayersPoints) && nextLayersPoints.length > 0 && (
        <group>
          {(selectedObject?.id != null
            ? nextLayersPoints.filter((e) => e.objectId === selectedObject.id)
            : nextLayersPoints
          ).slice(0, Math.min(ui.nodeLayerVisibleCount || 0, (selectedObject?.id != null ? nextLayersPoints.filter((e) => e.objectId === selectedObject.id).length : nextLayersPoints.length))).map((entry, idx) => {
            const capped = (ui.nodeLayerVisibleCount || 0) === (idx + 1)
            const capCount = Math.min(Math.max(1, ui.nodeVisibleCount || 1), entry.nodes.length)
            const nodesCapped = capped ? entry.nodes.slice(0, capCount) : entry.nodes
            const polyline = (() => {
              try {
                const layers = Array.isArray(generated?.layers) ? generated.layers : []
                if (layers.length === 0) return null
                let best = null
                let bestD = Infinity
                for (const L of layers) {
                  const d = Math.abs((L?.y ?? 0) - (entry?.y ?? 0))
                  if (d < bestD) { best = L; bestD = d }
                }
                const poly = best?.polylines?.[0]
                return Array.isArray(poly) && poly.length > 1 ? poly : null
              } catch (_) { return null }
            })()
            return (
              <NodeViewer
                key={`nx-${idx}`}
                nodeRing0={{
                  nodes: nodesCapped.map((n) => ({ id: n.id, p: n.p, tangent: n.tangent, normal: n.normal, theta: n.theta, quaternion: n.quaternion })),
                  meta: {
                    center: scaffoldCenter,
                    surfaceCenter: scaffoldCenter,
                    normal: [axisDir.x, axisDir.y, axisDir.z],
                    axisDir: [axisDir.x, axisDir.y, axisDir.z],
                    axisOrigin: [axisOrigin.x, axisOrigin.y, axisOrigin.z],
                    axisLen,
                    layerPolyline: polyline,
                    objectType: selectedObject?.type || null
                  }
                }}
                scaffold={{ segments: [] }}
                color={'#00aaff'}
                showNodes={true}
                showScaffold={false}
                objectType={selectedObject?.type || null}
              />
            )
          })}
        </group>
      )}

      {ui?.showScaffold && Array.isArray(chainScaffoldByLayer) && chainScaffoldByLayer.length > 0 && (
        <group>
          {(() => {
            const filteredByLayer = selectedObject?.id != null
              ? (chainScaffoldByLayer || []).filter((e) => e.objectId === selectedObject.id)
              : (chainScaffoldByLayer || [])
            const totalSteps = filteredByLayer.length || 0
            const raw = Math.max(0, Math.min(ui.visibleLayerCount || 0, totalSteps))
            // Ensure at least the initial step (StartPole -> Layer0) is shown when slider is at 0
            const vis = Math.max(1, raw)
            const arr = (vis >= totalSteps)
              ? [ { segments: filteredByLayer.flatMap(e => e.segments || e) } ]
              : filteredByLayer.slice(0, vis)
            return arr.map((entry, i) => (
              <NodeViewer key={`cf-${i}`} nodeRing0={{ nodes: [], meta: {} }} scaffold={{ segments: entry.segments || entry }} color={'#ff66ff'} showNodes={false} showScaffold={true} />
            ))
          })()}
        </group>
      )}

      {/* Stitch count labels per layer */}
      {/* Place along the detected layer axis (not fixed vertical) */}
      {Array.isArray(stitchCounts) && stitchCounts.length > 0 && scaffoldCenter && (
        <group>
          {(selectedObject?.id != null ? stitchCounts.filter((e) => e.objectId === selectedObject.id) : stitchCounts).map((entry, i) => {
            const pointsFiltered = selectedObject?.id != null
              ? (nextLayersPoints || []).filter((e) => e.objectId === selectedObject.id)
              : (nextLayersPoints || [])
            const ring = pointsFiltered?.[i]?.nodes || []
            let circ = 0
            let center = null
            if (Array.isArray(ring) && ring.length > 1) {
              // compute centroid of ring for label placement
              let sx = 0, sy = 0, sz = 0
              for (let k = 0; k < ring.length; k++) {
                const a = ring[k].p || ring[k]
                sx += a[0]; sy += a[1]; sz += a[2]
              }
              center = [sx / ring.length, sy / ring.length, sz / ring.length]
              // Prefer planner-provided circumference based on layer polyline when available
              const fromPlanner = pointsFiltered?.[i]?.circumference || 0
              if (fromPlanner > 0) {
                circ = fromPlanner
              } else {
                // Fallback: axis-aware circumference from ring nodes
                try {
                  const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z).normalize()
                  const centerAt = new THREE.Vector3(center[0], center[1], center[2])
                  const pts = ring.map((r) => (Array.isArray(r?.p) ? r.p : r))
                  circ = polylineLengthProjected(pts, [centerAt.x, centerAt.y, centerAt.z], [n.x, n.y, n.z])
                } catch (_) {}
              }
            }
            const label = circ > 0 ? `S:${entry.count}  C:${circ.toFixed(2)}` : `S:${entry.count}`
            // Place label offset 90° within the ring plane to avoid overlap along the axis
            const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z).normalize()
            const centerAt = center ? new THREE.Vector3(center[0], center[1], center[2]) : axisOrigin.clone().add(n.clone().multiplyScalar(entry.y))
            let seed = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)
            const u = seed.sub(n.clone().multiplyScalar(seed.dot(n))).normalize()
            const v90 = new THREE.Vector3().crossVectors(n, u)
            const radius = circ > 0 ? (circ / (2 * Math.PI)) : 0.2
            const offset = Math.max(0.02, radius * 0.15)
            const sign = (i % 2 === 0) ? 1 : -1
            const offsetPos = centerAt.clone().add(v90.clone().multiplyScalar(offset * sign))
            const pos = [offsetPos.x, offsetPos.y + 0.02, offsetPos.z]
            return (
              <Text key={`count-${i}`} position={pos} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
                {label}
              </Text>
            )
          })}
        </group>
      )}

      {/* Spacing labels per layer (toggle) */}
      {ui?.showSpacing && Array.isArray(spacingPerLayer) && spacingPerLayer.length > 0 && (
        <group>
          {(selectedObject?.id != null ? spacingPerLayer.filter((e) => e.objectId === selectedObject.id) : spacingPerLayer).map((entry, i) => (
            <Text key={`sp-${i}`} position={[entry.p?.[0] ?? scaffoldCenter?.[0] ?? 0, entry.y + 0.02, entry.p?.[2] ?? scaffoldCenter?.[2] ?? 0]} fontSize={0.12} color="#a0ffa0" anchorX="center" anchorY="middle">
              {`${entry.spacing.toFixed(2)}`}
            </Text>
          ))}
        </group>
      )}

      {/* Inc/Dec per step (toggle) */}
      {ui?.showIncDec && Array.isArray(transitionOps) && transitionOps.length > 0 && (
        <group>
          {transitionOps.map((e, i) => (
            <Text key={`op-${i}`} position={[scaffoldCenter?.[0] ?? 0, e.y + 0.25, scaffoldCenter?.[2] ?? 0]} fontSize={0.12} color="#ffd27a" anchorX="center" anchorY="middle">
              {`+${e.incs} / -${e.decs}`}
            </Text>
          ))}
        </group>
      )}
    </group>
  )
}

export default Scene3D
