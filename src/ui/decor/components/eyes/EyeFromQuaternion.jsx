import React, { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const EyeWithQuaternion = ({ id, position, quaternion, radius = 0.12, preview = false, selected = false, onSelect = null, onDelete = null, onClearOthers = null }) => {
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

  const handleClick = (e) => {
    if (preview) return
    e.stopPropagation()
    if (e.shiftKey && onDelete) {
      onDelete(id)
    } else if (onSelect) {
      // Clear all other selections first, then select this eye
      if (onClearOthers) onClearOthers()
      onSelect(id)
    }
  }

  return (
    <group position={pos} quaternion={quat} raycast={null} name={preview ? 'EyePreview' : 'Eye'}>
      <mesh 
        name={preview ? 'EyePreviewMesh' : 'EyeMesh'}
        renderOrder={preview ? 1001 : 8000}
        onClick={handleClick}
        onPointerOver={(e) => {
          if (!preview) {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={(e) => {
          if (!preview) {
            e.stopPropagation()
            document.body.style.cursor = 'default'
          }
        }}
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
          // Complex material for final eyes with selection highlighting
          <meshStandardMaterial
            color={0x111111}
            metalness={0.8}
            roughness={0.2}
            emissive={selected ? 0x001122 : 0x000000}  // Subtle blue emissive when selected
            emissiveIntensity={selected ? 0.2 : 0}
            depthTest={true}  // Enable depth so eye can properly occlude outline
            depthWrite={true}  // Write to depth buffer
          />
        )}
      </mesh>
      
      {/* Selection highlight - Outline Glow for non-preview eyes */}
      {!preview && selected && (
        <mesh
          raycast={null}
          name="EyeHighlight"
          scale={[1.08, 1.08, 1.08]}
          renderOrder={7000}  // Render after ALL other objects (3000) but before eye (8000)
        >
          <sphereGeometry args={[radius, 32, 24]} />
          <meshBasicMaterial
            color={0xffff66}
            transparent
            opacity={0.3}
            depthTest={false}  // Always draw (ignore depth)
            depthWrite={false}  // Don't write to depth buffer
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

export default EyeWithQuaternion
