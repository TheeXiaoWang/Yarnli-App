import React, { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useSceneStore } from '../../app/stores/sceneStore'
import { useTransformMode } from '../../app/contexts/TransformContext'
import * as THREE from 'three'

const SceneObject = ({ object, isSelected }) => {
  const meshRef = useRef()
  const transformRef = useRef()
  const { selectObject, updateObjectPosition, updateObjectScale, updateObjectRotation } = useSceneStore()
  const { transformMode, setIsTransforming } = useTransformMode()
  const [isDragging, setIsDragging] = useState(false)
  const groundY = 0

  const snapAboveGround = useCallback(() => {
    if (!meshRef.current) return
    const box = new THREE.Box3().setFromObject(meshRef.current)
    if (!isFinite(box.min.y)) return
    const lift = groundY - box.min.y
    if (lift > 0) {
      meshRef.current.position.y += lift
    }
  }, [])

  // Handle object click
  const handleClick = useCallback((event) => {
    event.stopPropagation()
    selectObject(object.id)
  }, [object.id, selectObject])

  // Handle transform start - disable orbit controls
  const handleTransformStart = useCallback(() => {
    setIsDragging(true)
    setIsTransforming(true)
  }, [setIsTransforming])

  // Handle transform end - re-enable orbit controls
  const handleTransformEnd = useCallback(() => {
    setIsDragging(false)
    setIsTransforming(false)
    
    // Update store with final values
    if (meshRef.current) {
      // Final clamp above ground
      snapAboveGround()
      const position = meshRef.current.position.toArray()
      const scale = meshRef.current.scale.toArray()
      const rotation = meshRef.current.rotation.toArray().map(angle => angle * (180 / Math.PI))

      updateObjectPosition(object.id, position)
      updateObjectScale(object.id, scale)
      updateObjectRotation(object.id, rotation)
    }
  }, [object.id, setIsTransforming, updateObjectPosition, updateObjectScale, updateObjectRotation])

  // Handle transform changes during dragging with throttling
  const handleTransformChange = useCallback(() => {
    if (meshRef.current && isDragging) {
      // Throttle updates to prevent performance issues during fast movements
      requestAnimationFrame(() => {
        if (meshRef.current && isDragging) {
          // Live clamp so objects never dip below ground while dragging/scaling
          snapAboveGround()
          const position = meshRef.current.position.toArray()
          const scale = meshRef.current.scale.toArray()
          const rotation = meshRef.current.rotation.toArray().map(angle => angle * (180 / Math.PI))

          updateObjectPosition(object.id, position)
          updateObjectScale(object.id, scale)
          updateObjectRotation(object.id, rotation)
        }
      })
    }
  }, [object.id, isDragging, updateObjectPosition, updateObjectScale, updateObjectRotation])

  // Sync mesh with store when object changes (including undo/redo) even if selected, as long as not dragging
  React.useEffect(() => {
    if (!meshRef.current || isDragging) return
    meshRef.current.position.set(...object.position)
    meshRef.current.scale.set(...object.scale)
    meshRef.current.rotation.set(
      object.rotation[0] * (Math.PI / 180),
      object.rotation[1] * (Math.PI / 180),
      object.rotation[2] * (Math.PI / 180)
    )
  }, [object.position, object.scale, object.rotation, isDragging])

  // Expose ALL objects globally for decor scene
  React.useEffect(() => {
    console.log('🟨 SceneObject effect - meshRef:', !!meshRef.current, 'objectId:', object.id, 'objectType:', object.type)
    console.log('🟨 Object data:', { id: object.id, type: object.type, position: object.position, scale: object.scale })
    
    if (meshRef.current) {
      // Initialize the global array if it doesn't exist
      if (!window.__EDITOR_ALL_OBJECTS__) {
        window.__EDITOR_ALL_OBJECTS__ = []
        console.log('🟨 Created new global array')
      }
      
      // Remove this object if it was already in the array
      const beforeLength = window.__EDITOR_ALL_OBJECTS__.length
      window.__EDITOR_ALL_OBJECTS__ = window.__EDITOR_ALL_OBJECTS__.filter(obj => obj.id !== object.id)
      if (window.__EDITOR_ALL_OBJECTS__.length < beforeLength) {
        console.log('🟨 Removed existing object from global array')
      }
      
      // Add this object to the global array
      window.__EDITOR_ALL_OBJECTS__.push({
        id: object.id,
        mesh: meshRef.current,
        object: object
      })
      
      console.log('🟨 EXPOSED editor object to global array:', object.id, object.type)
      console.log('🟨 Object scale:', object.scale)
      console.log('🟨 Total objects in global array:', window.__EDITOR_ALL_OBJECTS__.length)
      console.log('🟨 Global array contents:', window.__EDITOR_ALL_OBJECTS__)
    } else {
      console.log('🟨 No meshRef.current - object not ready yet')
    }
  }, [object.id, object.type, object.position, object.scale, object.rotation])

  // Clean up when component unmounts - but keep objects in global array for decor
  React.useEffect(() => {
    return () => {
      // Don't remove objects from global array when unmounting
      // This allows decor page to access editor objects even after switching pages
      console.log('🟨 SceneObject unmounting - keeping object in global array for decor:', object.id)
    }
  }, [object.id])

  // Animation frame update - only when not being transformed
  useFrame(() => {
    if (meshRef.current && !isSelected && !isDragging) {
      // Update mesh properties from store when not being transformed
      meshRef.current.position.set(...object.position)
      meshRef.current.scale.set(...object.scale)
      meshRef.current.rotation.set(
        object.rotation[0] * (Math.PI / 180),
        object.rotation[1] * (Math.PI / 180),
        object.rotation[2] * (Math.PI / 180)
      )
    }
  })

  // Render different object types
  const renderObject = () => {
    const commonProps = {
      ref: meshRef,
      position: object.position,
      scale: object.scale,
      rotation: [
        object.rotation[0] * (Math.PI / 180),
        object.rotation[1] * (Math.PI / 180),
        object.rotation[2] * (Math.PI / 180)
      ],
      onClick: handleClick,
      castShadow: true,
      receiveShadow: true
    }

    switch (object.type) {
      case 'sphere':
        return (
          <mesh {...commonProps}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial 
              color={object.color} 
              transparent={true}
              opacity={isSelected ? 0.8 : 1}
            />
          </mesh>
        )
      
      case 'cone':
        return (
          <mesh {...commonProps}>
            <coneGeometry args={[1, 2, 32]} />
            <meshStandardMaterial 
              color={object.color} 
              transparent={true}
              opacity={isSelected ? 0.8 : 1}
            />
          </mesh>
        )
      
      default:
        return null
    }
  }

  if (!object.visible) return null

  return (
    <group>
      {renderObject()}
      
      {/* Transform controls for selected objects */}
      {isSelected && (
        <TransformControls
          ref={transformRef}
          object={meshRef}
          mode={transformMode}
          onMouseDown={handleTransformStart}
          onMouseUp={handleTransformEnd}
          onObjectChange={handleTransformChange}
          size={0.75}
          showX={true}
          showY={true}
          showZ={true}
          translationSnap={0.1}
          rotationSnap={Math.PI / 18}
          scaleSnap={0.1}
          space="world"
        />
      )}
      
      {/* Cone selection glow (no wireframe) */}
      {isSelected && object.type === 'cone' && (
        <mesh
          position={object.position}
          scale={object.scale.map(s => s * 1.05)}
          rotation={[
            object.rotation[0] * (Math.PI / 180),
            object.rotation[1] * (Math.PI / 180),
            object.rotation[2] * (Math.PI / 180)
          ]}
        >
          <coneGeometry args={[1, 2, 32]} />
          <meshBasicMaterial 
            color="#00ff00" 
            transparent={true}
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* For spheres, use a subtle glow effect instead of wireframe */}
      {isSelected && object.type === 'sphere' && (
        <mesh
          position={object.position}
          scale={object.scale.map(s => s * 1.05)}
          rotation={[
            object.rotation[0] * (Math.PI / 180),
            object.rotation[1] * (Math.PI / 180),
            object.rotation[2] * (Math.PI / 180)
          ]}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial 
            color="#00ff00" 
            transparent={true}
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

export default SceneObject
