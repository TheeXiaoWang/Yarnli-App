import React, { useMemo } from 'react'
import * as THREE from 'three'

const ClickablePoint = ({ id, position, normal, ringTangent, quaternion, hovered, onActivate, onHover, onUnhover, onHoverEye, isUsed = false }) => {
  // Convert quaternion array to THREE.Quaternion for orientation
  const quat = useMemo(() => {
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      return new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
    }
    return new THREE.Quaternion() // Identity quaternion fallback
  }, [quaternion])

  return (
    <group
      name="GridPoint"
      position={position}
      quaternion={quat}
      userData={{ isGridPoint: true }}
      onPointerOver={(e) => { 
        e.stopPropagation()
        onHover?.(id)
        onHoverEye?.(position, normal, ringTangent, quaternion)
      }}
      onPointerOut={(e) => { 
        e.stopPropagation()
        onUnhover?.()
        onHoverEye?.(null, null, null, null)
      }}
      onPointerDown={(e) => { 
        console.log('🟡 ClickablePoint onPointerDown triggered!')
        console.log('Point ID:', id)
        console.log('Event:', e)
        console.log('onActivate function exists?', !!onActivate)
        e.stopPropagation()
        onActivate?.(id, position, normal, ringTangent, quaternion) 
      }}
    >
      {/* Visual dot - small sphere */}
      <mesh renderOrder={2000} userData={{ isGridPoint: true }}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={isUsed ? 0x888888 : (hovered ? 0xffaaaa : 0xff6666)}
          transparent={false}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Flattened bubble for easier clicking - oriented with quaternion */}
      <mesh
        scale={[0.25, 0.08, 0.25]}  // Wide and flat bubble: wider in X/Z, flatter in Y
        userData={{ isGridPoint: true }}
      >
        {/* Ellipsoid: wider in X and Z, flatter in Y (local space) */}
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial 
          transparent 
          opacity={0}
        />
      </mesh>
    </group>
  )
}
  

export default ClickablePoint


