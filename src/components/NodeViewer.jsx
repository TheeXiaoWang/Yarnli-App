import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { STITCH_TYPES } from '../constants/stitchTypes'
import { computeStitchDimensions } from '../layerlines/stitches'
import { useLayerlineStore } from '../stores/layerlineStore'

const NodeViewer = ({ nodeRing0, scaffold, color = '#ffaa00', showNodes = true, showScaffold = true, showConnections = false }) => {
  const nodeData = useMemo(() => {
    if (!nodeRing0?.nodes) return []
    return nodeRing0.nodes.map((n) => ({
      position: new THREE.Vector3(n.p[0], n.p[1], n.p[2]),
      tangent: new THREE.Vector3(n.tangent[0], n.tangent[1], n.tangent[2]).normalize(),
    }))
  }, [nodeRing0])

  const scaffoldLines = useMemo(() => {
    if (!scaffold?.segments) return []
    const lines = scaffold.segments.map((seg, i) => seg.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    // eslint-disable-next-line no-console
    if (lines.length > 0) console.log('[NodeViewer] drawing scaffold lines:', lines.length)
    return lines
  }, [scaffold])

  // Pull stitch/yarn settings
  const { settings } = useLayerlineStore()
  const stitchType = settings?.magicRingStitchType && STITCH_TYPES[settings.magicRingStitchType]
    ? settings.magicRingStitchType
    : 'mr'
  const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.mr
  const yarnLevel = Number(settings?.yarnSizeLevel) || 4

  // Compute scaled dimensions based on yarn size
  // Compute scaled dimensions based on yarn size, then apply per-stitch multipliers
  const baseDims = computeStitchDimensions({ sizeLevel: yarnLevel, baseWidth: 1, baseHeight: 1 })
  const widthMul = profile.widthMul ?? ((profile.width ?? 0.5) / 0.5)
  const heightMul = profile.heightMul ?? ((profile.height ?? 0.5) / 0.5)
  const depthMul = profile.depthMul ?? ((profile.depth ?? 0.75) / 0.75)
  const scaledWidth = baseDims.width * widthMul
  const scaledHeight = baseDims.height * heightMul
  const scaledDepth = baseDims.width * depthMul // base on width gauge for depth scaling

  // Map dimensions to render scale in scene units (keep similar visual footprint as before)
  // width: along layerline tangent; height: vertical; depth: perpendicular to surface
  // SphereGeometry(1) has radius=1 (diameter=2). Use half-dimensions for scale so
  // the resulting world-space diameter matches scaledWidth/Height/Depth.
  const scaleWidth = Math.max(0.0025, scaledWidth * 0.5)
  const scaleHeight = Math.max(0.0025, scaledHeight * 0.5)
  const scaleDepth = Math.max(0.0025, scaledDepth * 0.5)

  // Calculate node spacing for visual feedback
  const nodeSpacing = useMemo(() => {
    if (!nodeRing0?.nodes || nodeRing0.nodes.length < 2) return 0
    if (!nodeRing0?.meta?.radius) return 0
    
    const radius = nodeRing0.meta.radius
    const circumference = 2 * Math.PI * radius
    return circumference / nodeRing0.nodes.length
  }, [nodeRing0])

  return (
    <group>
      {/* Debug info - only show in development */}
      {process.env.NODE_ENV === 'development' && nodeRing0?.meta && (
        <group position={[0, 0, 0]}>
          {/* This would be a text overlay in a real implementation */}
        </group>
      )}

      {showScaffold && scaffoldLines.map((pts, i) => (
        <Line key={`sc-${i}`} points={pts} color={'#ff00ff'} lineWidth={4} opacity={1} transparent />
      ))}

      {showNodes && nodeData.map(({ position, tangent }, i) => {
        // Depth axis: perpendicular to surface (surface normal)
        let depthAxis = new THREE.Vector3(0, 1, 0)
        const center = nodeRing0?.meta?.surfaceCenter || nodeRing0?.meta?.center
        if (Array.isArray(center) && center.length === 3) {
          // Approximate surface normal from center->node
          depthAxis = new THREE.Vector3().subVectors(position, new THREE.Vector3(center[0], center[1], center[2])).normalize()
        } else {
          const ringNormal = nodeRing0?.meta?.normal
          if (Array.isArray(ringNormal) && ringNormal.length === 3) {
            depthAxis = new THREE.Vector3(ringNormal[0], ringNormal[1], ringNormal[2]).normalize()
          }
        }

        // Width axis: along the layerline tangent
        const widthAxis = tangent.clone().normalize()

        // Height axis: vertical direction, orthogonalized against width/depth (Gram-Schmidt)
        const worldUp = new THREE.Vector3(0, 1, 0)
        const heightAxisRaw = worldUp.clone()
        const heightAxis = heightAxisRaw
          .sub(widthAxis.clone().multiplyScalar(heightAxisRaw.dot(widthAxis)))
          .sub(depthAxis.clone().multiplyScalar(heightAxisRaw.dot(depthAxis)))
        if (heightAxis.lengthSq() < 1e-10) {
          heightAxis.copy(new THREE.Vector3().crossVectors(depthAxis, widthAxis))
        }
        heightAxis.normalize()

        // Build orientation basis: X=width, Y=height, Z=depth
        const basis = new THREE.Matrix4().makeBasis(widthAxis, heightAxis, depthAxis)
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis)

        // Use stitchType dimensions (scaled by yarn size) directly.
        // width (long axis) → tangent, height → vertical, depth → surface normal
        const scale = [scaleWidth, scaleHeight, scaleDepth]

        // Place the node's center directly on the layer position
        const adjustedPosition = position.clone()

        return (
          <mesh key={`node-${i}`} position={adjustedPosition} quaternion={quat} scale={scale}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={profile.color ?? 0x1f77b4} />
          </mesh>
        )
      })}

      {/* Optional: show node connections for Magic Ring (debug only) */}
      {showConnections && showNodes && nodeRing0?.meta?.isMagicRing && nodeData.length > 2 && (
        <group>
          {nodeData.map(({ position }, i) => {
            const nextIndex = (i + 1) % nodeData.length
            const nextPosition = nodeData[nextIndex].position
            return (
              <Line 
                key={`connection-${i}`} 
                points={[position, nextPosition]} 
                color="#00ff00" 
                lineWidth={1} 
                opacity={0.6} 
                transparent 
              />
            )
          })}
        </group>
      )}
    </group>
  )
}

export default NodeViewer


