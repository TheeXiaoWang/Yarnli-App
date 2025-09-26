import React, { useMemo } from 'react'
import * as THREE from 'three'

const FeltPiece = ({ id, shape, color, position, normal, scale = 1.0, sourceObject = null, orbitalDistance = 0.05, selected = false, onSelect = null, onDelete = null }) => {
  
  // Create geometry from the 2D shape
  const geometry = useMemo(() => {
    if (!shape || shape.length < 3) return null
    
    // Convert 2D shape to 3D vertices
    const vertices = []
    const indices = []
    
    // Create vertices for the shape (flat on XY plane initially)
    shape.forEach((point, i) => {
      vertices.push(point.x * scale, point.y * scale, 0)
    })
    
    // Simple triangulation for the shape (fan triangulation from first vertex)
    for (let i = 1; i < shape.length - 1; i++) {
      indices.push(0, i, i + 1)
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }, [shape, scale])

  // Position and orient the felt piece
  const { finalPosition, finalRotation } = useMemo(() => {
    if (!position || !normal) {
      return { 
        finalPosition: [0, 0, 0], 
        finalRotation: [0, 0, 0] 
      }
    }
    
    const pos = new THREE.Vector3(...position)
    const norm = new THREE.Vector3(...normal).normalize()
    
    // Offset the felt piece slightly from the surface
    const offsetDistance = orbitalDistance || 0.05
    const finalPos = pos.clone().add(norm.clone().multiplyScalar(offsetDistance))
    
    // Orient the felt piece to face outward from the surface
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    
    return {
      finalPosition: [finalPos.x, finalPos.y, finalPos.z],
      finalRotation: [euler.x, euler.y, euler.z]
    }
  }, [position, normal, orbitalDistance])

  // Handle click events
  const handleClick = (e) => {
    e.stopPropagation()
    if (e.shiftKey && onDelete) {
      onDelete(id)
    } else if (onSelect) {
      // Clear all other selections first, then select this felt
      const { clearAllSelections } = require('../../../../app/stores/decorStore').useDecorStore.getState()
      clearAllSelections()
      onSelect(id)
    }
  }

  if (!geometry) return null

  return (
    <group>
      <mesh
        position={finalPosition}
        rotation={finalRotation}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
        renderOrder={1002} // Render above other elements
      >
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.9}
          emissive={selected ? 0x001122 : 0x000000}  // Subtle blue emissive when selected
          emissiveIntensity={selected ? 0.15 : 0}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Selection highlight - Outline Glow */}
      {selected && (
        <mesh
          position={finalPosition}
          rotation={finalRotation}
          geometry={geometry}
          scale={[1.1, 1.1, 1.1]}
          renderOrder={6000}
        >
          <meshBasicMaterial
            color={0x66ffcc}  // Bright green outline for felt
            side={THREE.BackSide}
            transparent
            opacity={0.6}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  )
}

export default FeltPiece
