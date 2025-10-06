import React from 'react'
import * as THREE from 'three'
import { useDecorStore } from '../../../../app/stores/decorStore'

// Clones the source object (or global editor mesh) as invisible-but-raycastable targets
// so we can raycast safely without touching the rest of the scene graph.
const FeltRaycastTargets = React.forwardRef(function FeltRaycastTargets({ sourceObject, onMeshCreated }, ref) {
  const groupRef = React.useRef()
  const { showDebugRaycastMesh } = useDecorStore()

  React.useImperativeHandle(ref, () => groupRef.current, [])

  React.useEffect(() => {
    console.log('🔵 FeltRaycastTargets: Effect triggered')

    // Clear previous children
    const grp = groupRef.current
    if (!grp) {
      console.error('🔴 FeltRaycastTargets: No groupRef.current!')
      return
    }

    console.log('🔵 Clearing previous children, count:', grp.children.length)
    while (grp.children.length) grp.remove(grp.children[0])

    // Debug: Check what's available
    console.log('🔵 Checking mesh sources:')
    console.log('  - window.__EDITOR_SOURCE_OBJECT__:', window.__EDITOR_SOURCE_OBJECT__)
    console.log('  - window.__EDITOR_ALL_OBJECTS__:', window.__EDITOR_ALL_OBJECTS__)
    console.log('  - sourceObject prop:', sourceObject)

    // Prefer live editor mesh when available for exact world transforms
    const live = (typeof window !== 'undefined') ? window.__EDITOR_SOURCE_OBJECT__ : null
    let meshToClone = null
    let meshSource = 'none'

    if (live && live.isMesh) {
      meshToClone = live
      meshSource = 'window.__EDITOR_SOURCE_OBJECT__'
      console.log('✅ Using window.__EDITOR_SOURCE_OBJECT__')
    } else if (sourceObject && sourceObject.mesh && sourceObject.mesh.isMesh) {
      meshToClone = sourceObject.mesh
      meshSource = 'sourceObject.mesh'
      console.log('✅ Using sourceObject.mesh')
    } else {
      console.error('🔴 FeltRaycastTargets: No mesh available for raycasting!')
      console.log('  - window.__EDITOR_SOURCE_OBJECT__ exists?', !!live)
      console.log('  - window.__EDITOR_SOURCE_OBJECT__.isMesh?', live?.isMesh)
      console.log('  - sourceObject exists?', !!sourceObject)
      console.log('  - sourceObject.mesh exists?', !!sourceObject?.mesh)
      console.log('  - sourceObject.mesh.isMesh?', sourceObject?.mesh?.isMesh)

      // Create a fallback test sphere at the center for debugging
      console.log('🟡 Creating fallback test sphere at center for debugging')
      const fallbackGeometry = new THREE.SphereGeometry(3, 32, 32)
      const fallbackMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: showDebugRaycastMesh ? 0.3 : 0.0,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
      fallbackMesh.position.set(0, 0, 0)
      fallbackMesh.userData.isFeltTarget = true
      fallbackMesh.visible = true
      grp.add(fallbackMesh)
      console.log('✅ Added fallback test sphere at center')

      // Notify parent component about the mesh
      if (onMeshCreated) {
        console.log('🔵 Calling onMeshCreated with fallback mesh')
        onMeshCreated(fallbackMesh)
      }
      return
    }

    console.log('🔵 Mesh source:', meshSource)
    console.log('🔵 Mesh to clone:', meshToClone)
    console.log('🔵 Mesh geometry:', meshToClone.geometry)
    console.log('🔵 Mesh geometry type:', meshToClone.geometry?.type)
    console.log('🔵 Mesh geometry vertices:', meshToClone.geometry?.attributes?.position?.count)

    const clone = meshToClone.clone(true)
    // Preserve world transform for correct raycast positions
    clone.matrix.copy(meshToClone.matrixWorld)
    clone.matrixAutoUpdate = false

    let meshCount = 0
    clone.traverse((child) => {
      if (child.isObject3D) child.matrixAutoUpdate = false
      if (child.isMesh) {
        meshCount++
        console.log(`🔵 Setting up raycast mesh #${meshCount}:`, {
          name: child.name || 'unnamed',
          geometryType: child.geometry?.type,
          vertexCount: child.geometry?.attributes?.position?.count,
          visible: child.visible
        })

        // Keep raycast enabled, visibility controlled by toggle
        const baseColor = child.material?.color?.getHex?.() ?? 0x00ff00
        child.material = new THREE.MeshBasicMaterial({
          color: 0x00ff00, // Green for debugging
          transparent: true,
          opacity: showDebugRaycastMesh ? 0.3 : 0.0, // Toggle visibility
          depthTest: true,
          depthWrite: false,
          side: THREE.DoubleSide
        })
        child.userData.isFeltTarget = true
        child.visible = true // must remain visible for raycast
      }
    })

    console.log(`✅ FeltRaycastTargets: Added clone with ${meshCount} meshes`)
    console.log('🔵 Clone added to group, group children count:', grp.children.length)
    grp.add(clone)

    // Notify parent component about the cloned mesh
    if (onMeshCreated && meshToClone) {
      console.log('🔵 Calling onMeshCreated with cloned mesh')
      onMeshCreated(clone)
    }
  }, [sourceObject, showDebugRaycastMesh, onMeshCreated])

  return (
    <group ref={groupRef} name="FeltRaycastTargets" />
  )
})

export default FeltRaycastTargets


