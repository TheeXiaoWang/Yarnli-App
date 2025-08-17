import React from 'react'
import { RoundedBox, Edges, Capsule } from '@react-three/drei'

// Visual-only rounded/beveled cube to sit behind the label cube
// Keeps interactions delegated to GizmoViewcube rendered after it
const CustomViewCube = ({ scale = 1 }) => {
  return (
    <group scale={scale}>
      <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.32} smoothness={10} creaseAngle={0.9}>
        <meshPhysicalMaterial
          color="#5a4b76"
          metalness={0.1}
          roughness={0.35}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          sheen={0.4}
          sheenRoughness={0.8}
          emissive="#2a2340"
          emissiveIntensity={0.3}
        />
      </RoundedBox>
      <Edges scale={1.004} threshold={8}>
        <lineBasicMaterial color="#a390d8" linewidth={1} />
      </Edges>

      {/* Soft bead along edges for a unique bevel look */}
      <group>
        {/* Y edges (vertical) */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
          <Capsule key={`y-${i}`} args={[0.05, 1.08, 6, 12]} position={[0.55 * sx, 0, 0.55 * sz]}>
            <meshStandardMaterial color="#a390d8" emissive="#7d6bb8" emissiveIntensity={0.2} roughness={0.4} metalness={0.2} transparent opacity={0.25} />
          </Capsule>
        ))}

        {/* X edges */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sy, sz], i) => (
          <Capsule key={`x-${i}`} args={[0.05, 1.08, 6, 12]} position={[0, 0.55 * sy, 0.55 * sz]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#a390d8" emissive="#7d6bb8" emissiveIntensity={0.2} roughness={0.4} metalness={0.2} transparent opacity={0.25} />
          </Capsule>
        ))}

        {/* Z edges */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy], i) => (
          <Capsule key={`z-${i}`} args={[0.05, 1.08, 6, 12]} position={[0.55 * sx, 0.55 * sy, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#a390d8" emissive="#7d6bb8" emissiveIntensity={0.2} roughness={0.4} metalness={0.2} transparent opacity={0.25} />
          </Capsule>
        ))}
      </group>
    </group>
  )
}

export default CustomViewCube


