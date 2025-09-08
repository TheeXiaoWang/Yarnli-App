import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { STITCH_TYPES } from '../../constants/stitchTypes'
import { Text } from '@react-three/drei'
import { useNodeStore } from '../../stores/nodeStore'
import { computeStitchDimensions } from '../../layerlines/stitches'
import { useLayerlineStore } from '../../stores/layerlineStore'
import { calculateSphereOrientation, calculateConeOrientation, calculateDefaultOrientation } from '../../utils/nodes/orientation'

const NodeViewer = ({ nodeRing0, scaffold, color = '#ffaa00', showNodes = true, showScaffold = true, showConnections = false, showPoints = false, objectType = null }) => {
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
  // Enforce single crochet sizing for node placement visuals to avoid any warping
  const profile = STITCH_TYPES.sc
  const yarnLevel = Number(settings?.yarnSizeLevel) || 4

  // Compute scaled dimensions based on yarn size
  // Compute scaled dimensions based on yarn size, then apply per-stitch multipliers
  const baseDims = computeStitchDimensions({ sizeLevel: yarnLevel, baseWidth: 1, baseHeight: 1 })
  const scaledWidth = baseDims.width * (profile.widthMul ?? 1.0)
  const scaledHeight = baseDims.height * (profile.heightMul ?? 1.0)
  const scaledDepth = baseDims.width * (profile.depthMul ?? 0.5) // base on width gauge for depth scaling

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
        // Depth axis: prefer per-node radial from surfaceCenter/center (varies along sphere), fallback to ring plane normal
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

        // Width axis: use LOCAL tangent with fallback to radial method for small/unstable layers
        let widthAxis = null
        
        // Try polyline-based tangent first
        const layerPolyline = nodeRing0?.meta?.layerPolyline || null
        if (Array.isArray(layerPolyline) && layerPolyline.length > 2) {
          // Calculate layer size to detect very small layers near poles
          let totalLength = 0
          for (let j = 0; j < layerPolyline.length - 1; j++) {
            const a = new THREE.Vector3(layerPolyline[j][0], layerPolyline[j][1], layerPolyline[j][2])
            const b = new THREE.Vector3(layerPolyline[j+1][0], layerPolyline[j+1][1], layerPolyline[j+1][2])
            totalLength += a.distanceTo(b)
          }
          
          // For small layers near poles, use radial method; for larger layers use polyline method
          const isSmallLayer = totalLength < 0.5 // threshold for "small" layer
          
          if (isSmallLayer) {
            // Small layer: use neighbor-based tangent for better elliptical following
            const count = nodeData.length
            if (count >= 2) {
              const prevP = nodeData[(i - 1 + count) % count]?.position
              const nextP = nodeData[(i + 1) % count]?.position
              if (prevP && nextP) {
                const neighborTangent = nextP.clone().sub(prevP)
                if (neighborTangent.lengthSq() > 1e-12) {
                  widthAxis = neighborTangent.normalize()
                }
              }
            }
          } else {
            // Larger layer: use local polyline tangent with smoothing
            let bestIdx = 0, bestD2 = Infinity
            for (let j = 0; j < layerPolyline.length - 1; j++) {
              const a = new THREE.Vector3(layerPolyline[j][0], layerPolyline[j][1], layerPolyline[j][2])
              const b = new THREE.Vector3(layerPolyline[j+1][0], layerPolyline[j+1][1], layerPolyline[j+1][2])
              const ab = b.clone().sub(a)
              const ap = position.clone().sub(a)
              const t = Math.max(0, Math.min(1, ap.dot(ab) / Math.max(ab.lengthSq(), 1e-12)))
              const proj = a.clone().add(ab.clone().multiplyScalar(t))
              const d2 = proj.distanceToSquared(position)
              if (d2 < bestD2) { bestD2 = d2; bestIdx = j }
            }
            
            const span = Math.max(2, Math.min(8, Math.floor(layerPolyline.length / 8)))
            const startIdx = Math.max(0, bestIdx - span)
            const endIdx = Math.min(layerPolyline.length - 1, bestIdx + span)
            
            if (endIdx > startIdx) {
              const startPt = new THREE.Vector3(layerPolyline[startIdx][0], layerPolyline[startIdx][1], layerPolyline[startIdx][2])
              const endPt = new THREE.Vector3(layerPolyline[endIdx][0], layerPolyline[endIdx][1], layerPolyline[endIdx][2])
              const spanTangent = endPt.clone().sub(startPt)
              if (spanTangent.lengthSq() > 1e-12) {
                widthAxis = spanTangent.normalize()
              }
            }
          }
        }
        
        // Fallback: use provided tangent or derive from neighbors
        if (!widthAxis && tangent && tangent.isVector3) {
          widthAxis = tangent.clone().sub(depthAxis.clone().multiplyScalar(tangent.dot(depthAxis)))
          if (widthAxis.lengthSq() < 1e-10) {
            const arbitrary = Math.abs(depthAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
            widthAxis = arbitrary.sub(depthAxis.clone().multiplyScalar(arbitrary.dot(depthAxis)))
          }
          widthAxis.normalize()
        }
        
        // Final fallback: derive from neighboring nodes
        if (!widthAxis) {
          const count = nodeData.length
          if (count >= 2) {
            const prev = nodeData[(i - 1 + count) % count]?.position
            const next = nodeData[(i + 1) % count]?.position
            if (prev && next) {
              const derived = next.clone().sub(prev)
              if (derived.lengthSq() > 1e-12) {
                widthAxis = derived.sub(depthAxis.clone().multiplyScalar(derived.dot(depthAxis))).normalize()
              }
            }
          }
          if (!widthAxis || widthAxis.lengthSq() < 1e-12) {
            const arbitrary = Math.abs(depthAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
            widthAxis = arbitrary.sub(depthAxis.clone().multiplyScalar(arbitrary.dot(depthAxis))).normalize()
          }
        }


        // Build orientation with STRICT ring plane constraint: no 3D rotation, only in-plane alignment
        // X = layer tangent (width), Y = ring plane normal (up from layer), Z = secondary tangent in plane
        const ringNormalArr = nodeRing0?.meta?.normal || [0, 1, 0]
        const ringNormal = new THREE.Vector3(ringNormalArr[0], ringNormalArr[1], ringNormalArr[2]).normalize()
        const yAxis = ringNormal.clone()
        const zAxis = new THREE.Vector3().crossVectors(widthAxis, yAxis).normalize()
        const basis = new THREE.Matrix4().makeBasis(widthAxis, yAxis, zAxis)
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis)

        // Use stitchType dimensions (scaled by yarn size) directly - no size modifications
        // width (long axis) → tangent, height → vertical, depth → surface normal
        // Anisotropic visuals from stitch type: preserve longer width along the layer tangent
        const scale = [scaleWidth, scaleHeight, scaleDepth]

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


