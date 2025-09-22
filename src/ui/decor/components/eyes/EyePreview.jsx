import React from 'react'
import * as THREE from 'three'

const EyePreview = ({ position, normal, radius = 0.12 }) => {
  if (!position || !normal) return null
  const dir = new THREE.Vector3(...(normal || [0,1,0])).normalize()
  const worldUp = new THREE.Vector3(0, 1, 0)
  let tangent = new THREE.Vector3().crossVectors(worldUp, dir)
  if (tangent.lengthSq() < 1e-6) {
    tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), dir)
  }
  tangent.normalize()
  const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize()
  const m = new THREE.Matrix4().makeBasis(tangent, dir, bitangent)
  const quat = new THREE.Quaternion().setFromRotationMatrix(m)
  const offset = Math.max(0.001, radius * 0.02)
  const pos = [position[0] + dir.x * offset, position[1] + dir.y * offset, position[2] + dir.z * offset]
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[radius, 32, 16, 0, Math.PI/2, 0, Math.PI/2]} />
        <meshStandardMaterial color={0xffffff} transparent opacity={0.45} roughness={0.6} metalness={0.0} />
      </mesh>
    </group>
  )
}

export default EyePreview


