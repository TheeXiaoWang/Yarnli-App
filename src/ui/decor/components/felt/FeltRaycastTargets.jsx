import React from 'react'
import * as THREE from 'three'

// Clones the source object (or global editor mesh) as invisible-but-raycastable targets
// so we can raycast safely without touching the rest of the scene graph.
const FeltRaycastTargets = React.forwardRef(function FeltRaycastTargets({ sourceObject }, ref) {
  const groupRef = React.useRef()

  React.useImperativeHandle(ref, () => groupRef.current, [])

  React.useEffect(() => {
    // Clear previous children
    const grp = groupRef.current
    if (!grp) return
    while (grp.children.length) grp.remove(grp.children[0])

    // Prefer live editor mesh when available for exact world transforms
    const live = (typeof window !== 'undefined') ? window.__EDITOR_SOURCE_OBJECT__ : null
    let meshToClone = null

    if (live && live.isMesh) {
      meshToClone = live
    } else if (sourceObject && sourceObject.mesh && sourceObject.mesh.isMesh) {
      meshToClone = sourceObject.mesh
    }

    if (!meshToClone) return

    const clone = meshToClone.clone(true)
    // Preserve world transform for correct raycast positions
    clone.matrix.copy(meshToClone.matrixWorld)
    clone.matrixAutoUpdate = false
    clone.traverse((child) => {
      if (child.isObject3D) child.matrixAutoUpdate = false
      if (child.isMesh) {
        // Keep raycast enabled, but make it visually invisible
        const baseColor = child.material?.color?.getHex?.() ?? 0x000000
        child.material = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.0,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        })
        child.userData.isFeltTarget = true
        child.visible = true // must remain visible for raycast
      }
    })

    grp.add(clone)
  }, [sourceObject])

  return (
    <group ref={groupRef} name="FeltRaycastTargets" />
  )
})

export default FeltRaycastTargets


