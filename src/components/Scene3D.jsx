import React, { useCallback } from 'react'
import { useSceneStore } from '../stores/sceneStore'
import SceneObject from './SceneObject'
import { useLayerlineStore } from '../stores/layerlineStore'
import { useNodeStore } from '../stores/nodeStore'
import LayerlineViewer from './LayerlineViewer'
import NodeViewer from './NodeViewer'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

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
        if (vis > 0 && Array.isArray(nextLayersPoints) && nextLayersPoints.length > 0) {
          const upto = Math.min(vis, nextLayersPoints.length)
          for (let i = 0; i < upto; i++) {
            const ring = nextLayersPoints[i]
            if (!ring || !Array.isArray(ring.nodes) || ring.nodes.length === 0) continue
            const cap = (i === upto - 1) ? Math.min(Math.max(1, ui?.nodeVisibleCount || 1), ring.nodes.length) : ring.nodes.length
            const nodesCapped = ring.nodes.slice(0, cap)
            out.push(
              <NodeViewer key={`nx-ring-${i}`} nodeRing0={{ nodes: nodesCapped.map((n) => ({ p: n.p })), meta: { center: scaffoldCenter } }} scaffold={{ segments: [] }} color={'#00aaff'} showNodes={ui?.showNodes} showScaffold={false} showPoints={ui?.showNodePoints} />
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
          {nextLayersPoints.slice(0, Math.min(ui.nodeLayerVisibleCount || 0, nextLayersPoints.length)).map((entry, idx) => {
            const capped = (ui.nodeLayerVisibleCount || 0) === (idx + 1)
            const capCount = Math.min(Math.max(1, ui.nodeVisibleCount || 1), entry.nodes.length)
            const nodesCapped = capped ? entry.nodes.slice(0, capCount) : entry.nodes
            return (
              <NodeViewer key={`nx-${idx}`} nodeRing0={{ nodes: nodesCapped.map((n) => ({ p: n.p })), meta: { center: scaffoldCenter } }} scaffold={{ segments: [] }} color={'#00aaff'} showNodes={true} showScaffold={false} />
            )
          })}
        </group>
      )}

      {ui?.showScaffold && Array.isArray(chainScaffold) && chainScaffold.length > 0 && (
        <group>
          {(() => {
            const totalSteps = chainScaffoldByLayer?.length || 0
            const raw = Math.max(0, Math.min(ui.visibleLayerCount || 0, totalSteps))
            // Ensure at least the initial step (StartPole -> Layer0) is shown when slider is at 0
            const vis = Math.max(1, raw)
            const arr = (vis >= totalSteps)
              ? [ { segments: chainScaffold } ]
              : (Array.isArray(chainScaffoldByLayer) ? chainScaffoldByLayer.slice(0, vis) : [])
            return arr.map((entry, i) => (
              <NodeViewer key={`cf-${i}`} nodeRing0={{ nodes: [], meta: {} }} scaffold={{ segments: entry.segments || entry }} color={'#ff66ff'} showNodes={false} showScaffold={true} />
            ))
          })()}
        </group>
      )}

      {/* Stitch count labels per layer */}
      {Array.isArray(stitchCounts) && stitchCounts.length > 0 && scaffoldCenter && (
        <group>
          {stitchCounts.map((entry, i) => {
            const getRingNodes = () => {
              if (i === 0) return nodes?.nodes || []
              const ring = nextLayersPoints?.[i - 1]?.nodes || []
              return ring
            }
            const ring = getRingNodes()
            let circ = 0
            if (Array.isArray(ring) && ring.length > 1) {
              for (let k = 0; k < ring.length; k++) {
                const a = ring[k].p || ring[k]
                const b = ring[(k + 1) % ring.length].p || ring[(k + 1) % ring.length]
                circ += Math.hypot((a[0] - b[0]), (a[1] - b[1]), (a[2] - b[2]))
              }
            }
            const label = circ > 0 ? `S:${entry.count}  C:${circ.toFixed(2)}` : `S:${entry.count}`
            return (
              <Text key={`count-${i}`} position={[scaffoldCenter[0], entry.y + 0.02, scaffoldCenter[2]]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
                {label}
              </Text>
            )
          })}
        </group>
      )}

      {/* Spacing labels per layer (toggle) */}
      {ui?.showSpacing && Array.isArray(spacingPerLayer) && spacingPerLayer.length > 0 && (
        <group>
          {spacingPerLayer.map((entry, i) => (
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
