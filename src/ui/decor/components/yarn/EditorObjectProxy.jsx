import React, { useEffect, useState } from 'react'
import { useSceneStore } from '../../../../app/stores/sceneStore'
import * as THREE from 'three'

const EditorObjectProxy = ({ visible = true }) => {
  const { selectedObject } = useSceneStore()
  const [clone, setClone] = useState(null)

  useEffect(() => {
    console.log('🟦 EditorObjectProxy effect triggered!')
    console.log('🟦 selectedObject:', selectedObject)
    console.log('🟦 Global editor object:', window.__EDITOR_SOURCE_OBJECT__)
    console.log('🟦 Props - visible:', visible)
    
    // Try to get the actual editor object from the global reference
    const src = window.__EDITOR_SOURCE_OBJECT__
    console.log('🟦 Checking global object:', src)
    if (!src) {
      console.warn('🟦 No editor source object found in window.__EDITOR_SOURCE_OBJECT__')
      console.log('🟦 Will create fallback object...')
      // Fallback: create a basic representation based on selectedObject
      if (selectedObject) {
        console.log('🟦 Creating fallback object for:', selectedObject)
        const fallbackGeometry = selectedObject.type === 'sphere' 
          ? new THREE.SphereGeometry(1, 32, 32)
          : selectedObject.type === 'cone'
          ? new THREE.ConeGeometry(1, 2, 32)
          : new THREE.SphereGeometry(1, 16, 16)
        
        const fallbackMaterial = new THREE.MeshStandardMaterial({
          color: selectedObject.color || 0xff0000, // Use the object's actual color
          transparent: false,
          opacity: 1
        })
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
        fallbackMesh.position.set(...(selectedObject.position || [0,0,0]))
        fallbackMesh.scale.set(...(selectedObject.scale || [1,1,1]))
        fallbackMesh.rotation.set(
          (selectedObject.rotation?.[0] || 0) * (Math.PI / 180),
          (selectedObject.rotation?.[1] || 0) * (Math.PI / 180),
          (selectedObject.rotation?.[2] || 0) * (Math.PI / 180)
        )
        fallbackMesh.raycast = () => {}
        
        setClone(fallbackMesh)
        return
      } else {
        // Force create a red sphere if no selectedObject
        console.log('🟦 No selectedObject, creating emergency red sphere!')
        const emergencyGeometry = new THREE.SphereGeometry(5, 32, 32)
        const emergencyMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          transparent: false
        })
        const emergencyMesh = new THREE.Mesh(emergencyGeometry, emergencyMaterial)
        emergencyMesh.position.set(0, 0, 0)
        emergencyMesh.raycast = () => {}
        setClone(emergencyMesh)
        return
      }
    }

    try {
      // Deep clone the editor object and preserve world transform
      const c = src.clone(true)
      c.updateWorldMatrix(true, true)
      
      // Preserve world transform exactly as in editor
      const world = src.matrixWorld.clone()
      c.matrix.copy(world)
      c.matrixAutoUpdate = false
      c.traverse(o => { if (o.isObject3D) o.matrixAutoUpdate = false })

      c.traverse(obj => {
        if (obj.isMesh) {
          // Make non-interactive by removing from raycast consideration
          obj.userData.isHelper = true
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
      
      // Debug the clone's properties
      console.log('🟦 Clone position:', c.position)
      console.log('🟦 Clone scale:', c.scale)  
      console.log('🟦 Clone rotation:', c.rotation)
      console.log('🟦 Clone material:', c.material)
      console.log('🟦 Clone visible:', c.visible)
      
      setClone(c)
      console.log('Successfully cloned editor object:', c)
    } catch (error) {
      console.error('Failed to clone editor object:', error)
    }

    return () => setClone(null)
  }, [selectedObject])

  if (!visible || !clone) {
    console.log('🟦 EditorObjectProxy NOT RENDERING - visible:', visible, 'clone exists:', !!clone)
    if (!visible) console.log('🟦 Reason: visible prop is false')
    if (!clone) console.log('🟦 Reason: no clone object created')
    return null
  }
  
  console.log('🟦 EditorObjectProxy RENDERING clone:', clone)
  return <primitive object={clone} />
}

export default EditorObjectProxy
