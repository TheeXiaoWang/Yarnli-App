import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { STITCH_TYPES } from '../constants/stitchTypes'
import { Text } from '@react-three/drei'
import { useNodeStore } from '../stores/nodeStore'
import { computeStitchDimensions } from '../layerlines/stitches'
import { useLayerlineStore } from '../stores/layerlineStore'

const NodeViewer = ({ nodeRing0, scaffold, color = '#ffaa00', showNodes = true, showScaffold = true, showConnections = false, showPoints = false }) => {
  const nodeData = useMemo(() => {
    if (!nodeRing0?.nodes) return []
    const out = []
    for (const n of nodeRing0.nodes) {
      if (Array.isArray(n?.p) && n.p.length === 3) {
        const entry = {
          position: new THREE.Vector3(n.p[0], n.p[1], n.p[2]),
          tangent: null,
        }
        if (Array.isArray(n?.tangent) && n.tangent.length === 3) {
          entry.tangent = new THREE.Vector3(n.tangent[0], n.tangent[1], n.tangent[2]).normalize()
        }
        out.push(entry)
      }
    }
    return out
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
  const { ui } = useNodeStore()
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
      {(typeof import.meta !== 'undefined' && import.meta.env?.DEV) && nodeRing0?.meta && (
        <group position={[0, 0, 0]}>
          {/* This would be a text overlay in a real implementation */}
        </group>
      )}

      {showScaffold && scaffoldLines.map((pts, i) => {
        // Subtle light→dark gradient per segment (reduced saturation and lightness range)
        const base = new THREE.Color(color || '#ff00ff')
        const hsl = { h: 0, s: 0, l: 0 }
        base.getHSL(hsl)
        const sStart = Math.max(0, Math.min(1, hsl.s * 0.9))
        const sEnd = Math.max(0, Math.min(1, hsl.s * 0.5))
        const lStart = Math.min(0.6, hsl.l * 0.9)
        const lEnd = Math.max(0.08, hsl.l * 0.25)
        const cStart = new THREE.Color().setHSL(hsl.h, sStart, lStart)
        const cEnd = new THREE.Color().setHSL(hsl.h, sEnd, lEnd)
        return (
          <Line key={`sc-${i}`} points={pts} vertexColors={[cStart, cEnd]} lineWidth={3} opacity={0.85} transparent />
        )
      })}

      {(showNodes || showPoints) && nodeData.map(({ position, tangent }, i) => {
        // Depth axis: surface normal (prefer center→node radial; fallback to ring meta normal)
        let depthAxis = new THREE.Vector3(0, 1, 0)
        const center = nodeRing0?.meta?.surfaceCenter || nodeRing0?.meta?.center
        if (Array.isArray(center) && center.length === 3) {
          depthAxis = new THREE.Vector3().subVectors(position, new THREE.Vector3(center[0], center[1], center[2])).normalize()
        } else {
          const ringNormal = nodeRing0?.meta?.normal
          if (Array.isArray(ringNormal) && ringNormal.length === 3) {
            depthAxis = new THREE.Vector3(ringNormal[0], ringNormal[1], ringNormal[2]).normalize()
          }
        }

        // Width axis: prefer provided tangent; otherwise pick a stable perpendicular
        let widthAxis = null
        if (tangent && tangent.isVector3) {
          widthAxis = tangent.clone().sub(depthAxis.clone().multiplyScalar(tangent.dot(depthAxis)))
          if (widthAxis.lengthSq() < 1e-10) {
            const arbitrary = Math.abs(depthAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
            widthAxis = arbitrary.sub(depthAxis.clone().multiplyScalar(arbitrary.dot(depthAxis)))
          }
          widthAxis.normalize()
        } else {
          const arbitrary = Math.abs(depthAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
          widthAxis = arbitrary.sub(depthAxis.clone().multiplyScalar(arbitrary.dot(depthAxis))).normalize()
        }

        // Height axis: exact cross to complete right-handed orthonormal frame
        const heightAxis = new THREE.Vector3().crossVectors(depthAxis, widthAxis).normalize()

        // Build orientation basis: X=width, Y=height, Z=depth (orthonormal)
        const basis = new THREE.Matrix4().makeBasis(widthAxis, heightAxis, depthAxis)
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis)

        // Use stitchType dimensions (scaled by yarn size) directly.
        // width (long axis) → tangent, height → vertical, depth → surface normal
        const scale = showPoints ? [scaleWidth * 0.25, scaleHeight * 0.25, scaleDepth * 0.25] : [scaleWidth, scaleHeight, scaleDepth]

        // Place the node's center directly on the layer position
        const adjustedPosition = position.clone()

        return (
          <mesh key={`node-${i}`} position={adjustedPosition} quaternion={quat} scale={scale}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial color={profile.color ?? 0x1f77b4} roughness={0.55} metalness={0.05} />
          </mesh>
        )
      })}

      {/* Index labels (independent toggle) */}
      {ui?.showNodeIndices && nodeData.map(({ position }, i) => (
        <Text
          key={`node-label-${i}`}
          position={[position.x, position.y + (scaleHeight * 1.6), position.z]}
          fontSize={0.16}
          color="#ffffff"
          outlineWidth={0.02}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
        >{`${i}`}</Text>
      ))}

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


