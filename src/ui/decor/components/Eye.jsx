// Eye.jsx (DEBUG VERSION)
import React, { useMemo } from 'react'
import * as THREE from 'three'

const Eye = ({ position, radius = 0.5, preview = false }) => {
  const pos = useMemo(() => {
    if (!Array.isArray(position)) return [0, 0, 0]
    return position
  }, [position])

  return (
    <group position={pos} raycast={null} name={preview ? "EyePreview" : "Eye"}>
      <mesh raycast={null} name={preview ? "EyePreviewMesh" : "EyeMesh"}>
        {/* Full sphere, no cuts */}
        <sphereGeometry args={[radius, 32, 24]} />
        {/* Simple bright color, guaranteed visible */}
        <meshStandardMaterial 
          color={preview ? 0xffff00 : "yellow"}
          transparent={preview}
          opacity={preview ? 0.4 : 1}
          depthTest={false}
        />
      </mesh>
    </group>
  )
}

export default Eye