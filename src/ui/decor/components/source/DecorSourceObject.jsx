import React from 'react'
import * as THREE from 'three'

// Render the same source object from the editor in decor mode
// Mirrors geometry and transform from useSceneStore.selectedObject
// Non-interactive and drawn on top so it's always visible when toggled
const DecorSourceObject = ({ object }) => {
  if (!object) return null

  const commonProps = {
    position: object.position,
    scale: object.scale,
    rotation: [
      (object.rotation?.[0] || 0) * (Math.PI / 180),
      (object.rotation?.[1] || 0) * (Math.PI / 180),
      (object.rotation?.[2] || 0) * (Math.PI / 180)
    ],
    renderOrder: 2000,
    raycast: null,
    name: 'DecorSourceObject'
  }

  switch (object.type) {
    case 'sphere':
      return (
        <mesh {...commonProps}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={object.color}
            transparent
            opacity={0.25}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )
    case 'cone':
      return (
        <mesh {...commonProps}>
          <coneGeometry args={[1, 2, 32]} />
          <meshBasicMaterial
            color={object.color}
            transparent
            opacity={0.25}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )
    default:
      return null
  }
}

export default DecorSourceObject


