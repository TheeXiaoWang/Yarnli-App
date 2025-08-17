import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

// A cozy, artsy ground replacement for CAD grids
// - Large circular floor with soft color
// - Concentric stitch-like rings and subtle radial spokes
// - No shadows; purely decorative guidance
const YarnStage = ({ radius = 20, rings = 16, spokes = 12 }) => {
  const circlePoints = useMemo(() => (r) => {
    const pts = []
    const segs = 64
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.001, Math.sin(a) * r))
    }
    return pts
  }, [])

  const spokeLines = useMemo(() => {
    const arr = []
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      arr.push([new THREE.Vector3(0, 0.001, 0), dir.clone().multiplyScalar(radius)])
    }
    return arr
  }, [spokes, radius])

  return (
    <group>
      {/* Floor disk (XZ plane) */}
      <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 128]} />
        <meshPhysicalMaterial
          color="#201a2a"
          roughness={0.85}
          metalness={0.05}
          sheen={0.2}
          sheenRoughness={0.8}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Concentric stitch-like rings (XZ plane) */}
      {Array.from({ length: rings }).map((_, i) => {
        const t = i / (rings - 1 || 1)
        const r = 0.6 + t * (radius - 0.6)
        const color = new THREE.Color().setHSL(0.74, 0.35, 0.6 - t * 0.25)
        return (
          <Line
            key={`ring-${i}`}
            points={circlePoints(r)}
            color={color.getStyle()}
            lineWidth={0.8}
            transparent
            opacity={0.22 - t * 0.12}
          />
        )
      })}

      {/* Radial spokes (very subtle) */}
      {spokeLines.map((pts, i) => (
        <Line
          key={`spoke-${i}`}
          points={pts}
          color="#8a7bbf"
          lineWidth={0.6}
          transparent
          opacity={0.12}
        />
      ))}
    </group>
  )
}

export default YarnStage


