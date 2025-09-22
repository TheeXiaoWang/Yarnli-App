import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useDecorStore } from '../../../../app/stores/decorStore'

const FeltPlacement = ({ hoverPreview, sourceObject, orbitalDistance }) => {
  
  // Get the pending felt shape and color from sessionStorage (set by FeltModal)
  const { pendingFeltShape, pendingFeltColor } = useMemo(() => {
    try {
      const shapeStored = sessionStorage.getItem('pendingFeltShape')
      const colorStored = sessionStorage.getItem('pendingFeltColor')
      return {
        pendingFeltShape: shapeStored ? JSON.parse(shapeStored) : null,
        pendingFeltColor: colorStored || '#ff6b6b'
      }
    } catch {
      return { pendingFeltShape: null, pendingFeltColor: '#ff6b6b' }
    }
  }, [])

  // Create geometry from the pending shape
  const geometry = useMemo(() => {
    if (!pendingFeltShape || pendingFeltShape.length < 3) return null
    
    // Convert 2D shape to 3D vertices
    const vertices = []
    const indices = []
    
    // Create vertices for the shape (flat on XY plane initially)
    const scale = 0.5 // Scale down for placement
    pendingFeltShape.forEach((point, i) => {
      vertices.push(point.x * scale, point.y * scale, 0)
    })
    
    // Simple triangulation for the shape (fan triangulation from first vertex)
    for (let i = 1; i < pendingFeltShape.length - 1; i++) {
      indices.push(0, i, i + 1)
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }, [pendingFeltShape])

  // Position and orient the preview felt piece
  const { finalPosition, finalRotation } = useMemo(() => {
    if (!hoverPreview || !hoverPreview.position || !hoverPreview.normal) {
      return { 
        finalPosition: [0, 0, 0], 
        finalRotation: [0, 0, 0] 
      }
    }
    
    const pos = new THREE.Vector3(...hoverPreview.position)
    const norm = new THREE.Vector3(...hoverPreview.normal).normalize()
    
    // Offset the felt piece from the surface
    const offsetDistance = orbitalDistance || 0.05
    const finalPos = pos.clone().add(norm.clone().multiplyScalar(offsetDistance))
    
    // Orient the felt piece to face outward from the surface
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    
    return {
      finalPosition: [finalPos.x, finalPos.y, finalPos.z],
      finalRotation: [euler.x, euler.y, euler.z]
    }
  }, [hoverPreview, orbitalDistance])

  if (!pendingFeltShape || !geometry || !hoverPreview) return null

  return (
    <mesh
      position={finalPosition}
      rotation={finalRotation}
      geometry={geometry}
      renderOrder={1003} // Render above other elements
    >
      <meshStandardMaterial
        color={pendingFeltColor}
        side={THREE.DoubleSide}
        transparent={true}
        opacity={0.7}
        emissive={0x111111}
        emissiveIntensity={0.2}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

export default FeltPlacement
