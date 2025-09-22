import React, { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const EyeWithQuaternion = ({ position, quaternion, radius = 0.12, preview = false }) => {
  const { camera } = useThree()
  
  // Always render eyes - removed camera facing restriction
  const shouldRender = useMemo(() => {
    return true // Always show all eyes regardless of camera angle
  }, [position, camera])

  // Simple positioning and orientation
  const { pos, quat } = useMemo(() => {
    const basePos = new THREE.Vector3(...(Array.isArray(position) ? position : [0, 0, 0]))
    const sphereCenter = new THREE.Vector3(0, 0, 0)
    
    // Calculate outward direction from sphere center
    const outwardDir = sphereCenter.clone().sub(basePos).normalize().negate()
    
    // Position slightly in front of surface
    const finalPos = basePos.clone().add(outwardDir.clone().multiplyScalar(radius * 0.3))
    
    // Orient hemisphere dome to point outward
    const defaultUp = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, outwardDir)
    
    return {
      pos: [finalPos.x, finalPos.y, finalPos.z],
      quat: quaternion
    }
  }, [position, radius])

  // Always render all eyes
  if (!shouldRender) return null

  return (
    <group position={pos} quaternion={quat} raycast={null} name={preview ? 'EyePreview' : 'Eye'}>
      <mesh 
        raycast={null} 
        name={preview ? 'EyePreviewMesh' : 'EyeMesh'}
        renderOrder={1001}
      >
        {preview ? (
          // Low-poly geometry for preview
          <sphereGeometry args={[radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        ) : (
          // Higher quality for final eyes
          <sphereGeometry args={[radius, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        )}
        {preview ? (
          // Simple material for preview
          <meshBasicMaterial
            color={0x444444}
            transparent={true}
            opacity={0.6}
            depthTest={false}
          />
        ) : (
          // Complex material for final eyes
          <meshStandardMaterial
            color={0x111111}
            metalness={0.8}
            roughness={0.2}
          />
        )}
      </mesh>
    </group>
  )
}

export default EyeWithQuaternion
