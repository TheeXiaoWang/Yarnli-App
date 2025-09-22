import React, { useEffect, useState } from 'react'
import * as THREE from 'three'

const AllEditorObjects = ({ visible = true }) => {
  const [clones, setClones] = useState([])

  useEffect(() => {
    console.log('🟦 AllEditorObjects effect triggered!')
    console.log('🟦 Global editor objects:', window.__EDITOR_ALL_OBJECTS__)
    console.log('🟦 Global editor objects length:', window.__EDITOR_ALL_OBJECTS__?.length || 0)
    console.log('🟦 Props - visible:', visible)
    console.log('🟦 Window object exists:', typeof window !== 'undefined')
    
    if (!visible) {
      console.log('🟦 Not visible, clearing clones')
      setClones([])
      return
    }
    
    // If no global array exists or is empty, show nothing
    if (!window.__EDITOR_ALL_OBJECTS__ || window.__EDITOR_ALL_OBJECTS__.length === 0) {
      console.log('🟦 No global editor objects found - nothing to show')
      setClones([])
      return
    }

    console.log('🟦 Cloning', window.__EDITOR_ALL_OBJECTS__.length, 'editor objects')
    console.log('🟦 Global array contents:', window.__EDITOR_ALL_OBJECTS__)
    
    const newClones = window.__EDITOR_ALL_OBJECTS__.map(({ id, mesh, object }) => {
      console.log('🟦 Processing object:', { id, hasMesh: !!mesh, objectType: object?.type, object })
      try {
        let clone
        
        if (mesh) {
          // Clone the existing mesh with its current world transform
          console.log('🟦 Cloning actual editor mesh:', {
            id,
            meshType: mesh.type,
            meshPosition: mesh.position?.toArray?.(),
            meshScale: mesh.scale?.toArray?.(),
            meshRotation: mesh.rotation?.toArray?.(),
            meshMatrixWorld: mesh.matrixWorld?.elements,
            meshGeometry: mesh.geometry?.type,
            meshMaterial: mesh.material?.type,
            meshVisible: mesh.visible
          })
          
          clone = mesh.clone()
          
          // Preserve the world transform exactly
          clone.matrix.copy(mesh.matrixWorld)
          clone.matrixAutoUpdate = false
          clone.updateMatrixWorld(true)
          
          console.log('🟦 Cloned mesh properties:', {
            clonePosition: clone.position?.toArray?.(),
            cloneScale: clone.scale?.toArray?.(),
            cloneRotation: clone.rotation?.toArray?.(),
            cloneMatrix: clone.matrix?.elements
          })
        } else {
          // Create a new mesh for fallback objects
          console.log('🟦 Creating fallback mesh for:', id, object.type)
          const geometry = object.type === 'sphere' 
            ? new THREE.SphereGeometry(1, 32, 32)
            : new THREE.ConeGeometry(1, 2, 32)
          
          const material = new THREE.MeshBasicMaterial({
            color: object.color || 0xff6b6b,
            transparent: true,
            opacity: 0.22,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
          })
          
          clone = new THREE.Mesh(geometry, material)
          clone.position.set(...object.position)
          clone.scale.set(...object.scale)
          clone.rotation.set(
            object.rotation[0] * (Math.PI / 180),
            object.rotation[1] * (Math.PI / 180),
            object.rotation[2] * (Math.PI / 180)
          )
        }
        
        // Make it non-interactive and overlay-visible
        clone.traverse(obj => {
          if (obj.isMesh) {
            obj.raycast = () => {}  // Make non-interactive only
            // Ensure always visible as an overlay in decor
            try {
              const baseColor = obj.material?.color?.getHex?.() ?? 0xff0000
              obj.material = new THREE.MeshBasicMaterial({
                color: baseColor,
                transparent: true,
                opacity: 0.22,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide
              })
              obj.renderOrder = 3000
            } catch (_) { }
          }
        })
        
        console.log('🟦 Successfully cloned editor object:', id, object.type)
        return { id, clone, object }
      } catch (error) {
        console.error('🟦 Failed to clone object:', id, error)
        return null
      }
    }).filter(Boolean)

    setClones(newClones)
    console.log('🟦 Total clones created:', newClones.length)
  }, [visible])


  console.log('🟦 AllEditorObjects render - visible:', visible, 'clones:', clones.length)
  
  if (!visible || clones.length === 0) {
    console.log('🟦 AllEditorObjects NOT RENDERING - visible:', visible, 'clones:', clones.length)
    return null
  }

  console.log('🟦 AllEditorObjects RENDERING', clones.length, 'clones')
  
  return (
    <group>
      {clones.map(({ id, clone, object }) => (
        <primitive 
          key={id} 
          object={clone} 
        />
      ))}
    </group>
  )
}

export default AllEditorObjects
