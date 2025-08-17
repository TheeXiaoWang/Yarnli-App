import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { STITCH_TYPES } from '../constants/stitchTypes'

const NodeViewer = ({ nodeRing0, scaffold, color = '#ffaa00', showNodes = true, showScaffold = true }) => {
  const nodeData = useMemo(() => {
    if (!nodeRing0?.nodes) return []
    return nodeRing0.nodes.map((n) => ({
      position: new THREE.Vector3(n.p[0], n.p[1], n.p[2]),
      tangent: new THREE.Vector3(n.tangent[0], n.tangent[1], n.tangent[2]).normalize(),
    }))
  }, [nodeRing0])

  const scaffoldLines = useMemo(() => {
    if (!scaffold?.segments) return []
    return scaffold.segments.map((seg, i) => seg.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  }, [scaffold])

  const nodeProfile = STITCH_TYPES?.mr || STITCH_TYPES.sc
  const radiusXY = Math.max(0.005, (nodeProfile.width ?? 0.5) * 0.05)
  const radiusZ = Math.max(0.005, (nodeProfile.depth ?? nodeProfile.width ?? 0.5) * 0.05)

  return (
    <group>
      {showScaffold && scaffoldLines.map((pts, i) => (
        <Line key={`sc-${i}`} points={pts} color={color} lineWidth={1} opacity={0.9} transparent />
      ))}

      {showNodes && nodeData.map(({ position, tangent }, i) => {
        // Orient node depth axis along surface normal (approx). Use tangent (loop) and radial (center->node) to compute normal.
        const center = nodeRing0?.meta?.center
        let normal = new THREE.Vector3(0, 1, 0)
        if (Array.isArray(center) && center.length === 3) {
          const radial = new THREE.Vector3().subVectors(position, new THREE.Vector3(center[0], center[1], center[2]))
          if (radial.lengthSq() > 1e-12) {
            // For a ring, approximate surface normal by cross(tangent, radial)
            normal = new THREE.Vector3().crossVectors(tangent, radial).normalize()
          }
        }
        const up = normal.clone().normalize()
        const right = new THREE.Vector3().crossVectors(up, tangent).normalize()
        const basis = new THREE.Matrix4().makeBasis(right, up, tangent)
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis)
        const scale = [radiusXY, radiusZ, radiusXY]
        return (
          <mesh key={`node-${i}`} position={position} quaternion={quat} scale={scale}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={nodeProfile.color ?? 0x1f77b4} />
          </mesh>
        )
      })}
    </group>
  )
}

export default NodeViewer


