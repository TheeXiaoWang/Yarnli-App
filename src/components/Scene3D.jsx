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
  const { nodes, scaffold, nextNodes, nextScaffold, chainScaffold, stitchCounts, scaffoldCenter, ui } = useNodeStore()

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

      {/* Render MR nodes and scaffold */}
      {nodes && (ui?.showNodes || ui?.showScaffold) && (
        <NodeViewer nodeRing0={nodes} scaffold={scaffold} color={'#ffaa00'} showNodes={ui.showNodes} showScaffold={ui.showScaffold} showConnections={false} />
      )}

      {/* Render next-layer nodes and scaffold if present */}
      {(nextNodes || nextScaffold) && (ui?.showNodes || ui?.showScaffold) && (
        <NodeViewer nodeRing0={nextNodes || { nodes: [], meta: {} }} scaffold={nextScaffold} color={'#00aaff'} showNodes={false} showScaffold={ui.showScaffold} />
      )}

      {settings.showFullScaffold && Array.isArray(chainScaffold) && chainScaffold.length > 0 && ui?.showScaffold && (
        <NodeViewer nodeRing0={{ nodes: [], meta: {} }} scaffold={{ segments: chainScaffold }} color={'#ff66ff'} showNodes={false} showScaffold={true} />
      )}

      {/* Stitch count labels per layer */}
      {Array.isArray(stitchCounts) && stitchCounts.length > 0 && scaffoldCenter && (
        <group>
          {stitchCounts.map((entry, i) => (
            <Text key={`count-${i}`} position={[scaffoldCenter[0], entry.y + 0.02, scaffoldCenter[2]]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
              {`S:${entry.count}`}
            </Text>
          ))}
        </group>
      )}
    </group>
  )
}

export default Scene3D
