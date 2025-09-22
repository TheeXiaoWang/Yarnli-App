import React, { useEffect, useState, useMemo } from 'react'
import { useSceneStore } from '../../../../app/stores/sceneStore'
import * as THREE from 'three'

const OrbitProxy = ({ center = [0,0,0], baseRadius = 1, orbitDistance = 0.15, curvatureCompensation = 0.7, visible = true, color = 0x66ccff }) => {
  const { selectedObject } = useSceneStore()
  const [clone, setClone] = useState(null)

  const scaleMultiplier = useMemo(() => {
    // Calculate how much to scale the source object to create orbital surface
    return 1 + (orbitDistance / Math.max(0.1, baseRadius))
  }, [baseRadius, orbitDistance])

  useEffect(() => {
    console.log('OrbitProxy effect triggered, selectedObject:', selectedObject)
    console.log('Global editor object for orbit proxy:', window.__EDITOR_SOURCE_OBJECT__)
    
    // Try to get the actual editor object from the global reference
    const src = window.__EDITOR_SOURCE_OBJECT__
    if (!src) {
      console.warn('No editor source object found for orbit proxy, creating fallback')
      // Fallback: create a basic scaled representation
      if (selectedObject) {
        const fallbackGeometry = selectedObject.type === 'sphere' 
          ? new THREE.SphereGeometry(1, 32, 32)
          : selectedObject.type === 'cone'
          ? new THREE.ConeGeometry(1, 2, 32)
          : new THREE.SphereGeometry(1, 16, 16)
        
        const fallbackMaterial = new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
        fallbackMesh.position.set(...(selectedObject.position || [0,0,0]))
        
        // Scale up by orbital distance
        const originalScale = selectedObject.scale || [1,1,1]
        fallbackMesh.scale.set(
          originalScale[0] * scaleMultiplier,
          originalScale[1] * scaleMultiplier,
          originalScale[2] * scaleMultiplier
        )
        
        fallbackMesh.rotation.set(
          (selectedObject.rotation?.[0] || 0) * (Math.PI / 180),
          (selectedObject.rotation?.[1] || 0) * (Math.PI / 180),
          (selectedObject.rotation?.[2] || 0) * (Math.PI / 180)
        )
        fallbackMesh.raycast = () => {}
        
        setClone(fallbackMesh)
        return
      }
      return
    }

    try {
      // Deep clone the editor object
      const c = src.clone(true)
      c.updateWorldMatrix(true, true)
      
      // Create offset surface instead of uniform scaling
      c.traverse(obj => {
        if (obj.isMesh && obj.geometry) {
          // Create offset geometry by moving vertices outward along their normals
          const originalGeometry = obj.geometry
          const offsetGeometry = originalGeometry.clone()
          
          // Ensure geometry has vertex normals
          if (!offsetGeometry.attributes.normal) {
            offsetGeometry.computeVertexNormals()
          }
          
          const positions = offsetGeometry.attributes.position
          const normals = offsetGeometry.attributes.normal
          
          // Move each vertex outward with curvature-aware orbital distance
          for (let i = 0; i < positions.count; i++) {
            const normal = new THREE.Vector3(
              normals.getX(i),
              normals.getY(i), 
              normals.getZ(i)
            ).normalize()
            
            const currentPos = new THREE.Vector3(
              positions.getX(i),
              positions.getY(i),
              positions.getZ(i)
            )
            
            // Calculate distance from object center to this point
            const centerPos = new THREE.Vector3(...center)
            const distanceFromCenter = currentPos.distanceTo(centerPos)
            
            // Calculate curvature factor based on distance from center
            // Points closer to center (high curvature areas like ellipsoid ends) get less offset
            // Points farther from center (low curvature areas like ellipsoid sides) get full offset
            const maxDistance = baseRadius * 1.2 // Approximate max radius
            const minDistance = baseRadius * 0.8 // Approximate min radius
            
            // Normalize distance to 0-1 range
            const normalizedDistance = Math.max(0, Math.min(1, 
              (distanceFromCenter - minDistance) / (maxDistance - minDistance)
            ))
            
            // Curvature-aware offset with tunable compensation
            // curvatureCompensation = 0: no reduction (uniform orbital distance)
            // curvatureCompensation = 1: maximum reduction (high curvature gets minimal distance)
            const minFactor = 1.0 - curvatureCompensation // How much to reduce at high curvature
            const curvatureFactor = minFactor + (curvatureCompensation * normalizedDistance)
            const adjustedOrbitDistance = orbitDistance * curvatureFactor
            
            // Move outward by adjusted orbital distance
            const offsetPos = currentPos.add(normal.multiplyScalar(adjustedOrbitDistance))
            
            positions.setXYZ(i, offsetPos.x, offsetPos.y, offsetPos.z)
          }
          
          offsetGeometry.attributes.position.needsUpdate = true
          offsetGeometry.computeVertexNormals() // Recompute normals after offset
          
          obj.geometry = offsetGeometry
          obj.raycast = () => {} // Make non-interactive
          obj.material = new THREE.MeshBasicMaterial({
            color,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
          })
        }
      })
      
      setClone(c)
      console.log('Successfully created offset surface for orbit proxy:', c)
    } catch (error) {
      console.error('Failed to create offset surface for orbit proxy:', error)
      // Fallback to scaling if offset surface fails
      const c = src.clone(true)
      c.scale.multiplyScalar(scaleMultiplier)
      c.traverse(obj => {
        if (obj.isMesh) {
          obj.raycast = () => {}
          obj.material = new THREE.MeshBasicMaterial({
            color, wireframe: true, transparent: true, opacity: 0.15, side: THREE.DoubleSide
          })
        }
      })
      setClone(c)
    }

    return () => setClone(null)
  }, [selectedObject, scaleMultiplier, curvatureCompensation, orbitDistance, baseRadius, center, color])

  if (!visible || !clone) {
    console.log('OrbitProxy not rendering - visible:', visible, 'clone:', !!clone)
    return null
  }
  
  console.log('OrbitProxy rendering scaled clone:', clone)
  return <primitive object={clone} />
}

export default OrbitProxy


