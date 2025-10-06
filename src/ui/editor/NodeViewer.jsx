import React, { useMemo } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { STITCH_TYPES } from '../../constants/stitchTypes'
import { Text } from '@react-three/drei'
import { useNodeStore } from '../../app/stores/nodeStore'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { calculateSphereOrientation, calculateConeOrientation, calculateDefaultOrientation } from '../../domain/nodes/utils/orientation'
import { computeLayerTiltAngle } from '../../domain/layerlines/tilt'
import { getQuaternionFromTN } from '../../utils/nodes/orientation/getQuaternionFromTN'

const NodeViewer = ({ nodeRing0, scaffold, color = '#ffaa00', showNodes = true, showScaffold = true, showConnections = false, showPoints = false, objectType = null }) => {
  const nodeData = useMemo(() => {
    if (!nodeRing0?.nodes) return []

    // Debug logging to identify which layer is being rendered
    console.log('[NodeViewer] Rendering nodes:', {
      'nodeCount': nodeRing0.nodes.length,
      'color': color,
      'isMagicRing': nodeRing0.meta?.isMagicRing,
      'layerY': nodeRing0.meta?.y,
      'isYellow (magic ring)': color === '#ffaa00',
      'isCyan (Layer 1+)': color === '#00aaff',
    })

    const out = []
    for (const n of nodeRing0.nodes) {
      if (Array.isArray(n?.p) && n.p.length === 3) {
        const entry = {
          id: n?.id ?? null,
          position: new THREE.Vector3(n.p[0], n.p[1], n.p[2]),
          tangent: null,
          normal: null,
        }
        if (Array.isArray(n?.tangent) && n.tangent.length === 3) {
          entry.tangent = new THREE.Vector3(n.tangent[0], n.tangent[1], n.tangent[2]).normalize()
        }
        if (Array.isArray(n?.normal) && n.normal.length === 3) {
          entry.normal = new THREE.Vector3(n.normal[0], n.normal[1], n.normal[2]).normalize()
        }
        if (typeof n?.theta === 'number') {
          entry.theta = n.theta
        }
        if (Array.isArray(n?.quaternion) && n.quaternion.length === 4) {
          entry.quaternion = n.quaternion.slice(0, 4)
        }
        // Include stitch type information
        if (n?.stitchType) {
          entry.stitchType = n.stitchType
        }
        if (n?.stitchProfile) {
          entry.stitchProfile = n.stitchProfile
        }
        out.push(entry)
      }
    }

    // DEBUG: Log quaternion data received by NodeViewer
    if (import.meta?.env?.DEV && out.length > 0) {
      const quaternionCount = out.filter(n => n.quaternion).length
      const layerY = nodeRing0?.meta?.y

      // Track first and last layers
      if (typeof window !== 'undefined') {
        if (!window.__FIRST_LAYER_Y_VIEWER) {
          window.__FIRST_LAYER_Y_VIEWER = layerY
          window.__FIRST_LAYER_QUAT_VIEWER = out[0]?.quaternion
        }
        window.__LAST_LAYER_Y_VIEWER = layerY
        window.__LAST_LAYER_QUAT_VIEWER = out[0]?.quaternion
      }

      console.log('[NodeViewer] Received nodes:', {
        totalNodes: out.length,
        nodesWithQuaternion: quaternionCount,
        layerY: layerY,
        firstNodeQuaternion: out[0]?.quaternion,
        firstNodeTheta: out[0]?.theta,
        firstNodeThetaDeg: out[0]?.theta ? THREE.MathUtils.radToDeg(out[0].theta) : null,
        lastNodeQuaternion: out[out.length - 1]?.quaternion,
        ringMeta: nodeRing0?.meta,
      })
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

  // Dev helper: simple dot spheres at node centers (include id to highlight node 0)
  const dotNodes = useMemo(() => {
    const nodes = nodeRing0?.nodes || []
    return nodes.map((n) => ({ id: n?.id ?? null, p: (Array.isArray(n?.p) ? n.p.slice(0, 3) : [0, 0, 0]) }))
  }, [nodeRing0])

  // Pull stitch/yarn settings
  const { settings } = useLayerlineStore()
  const { ui } = useNodeStore()
  const yarnLevel = Number(settings?.yarnSizeLevel) || 4

  // Compute base dimensions based on yarn size
  const baseDims = computeStitchDimensions({ sizeLevel: yarnLevel, baseWidth: 1, baseHeight: 1 })

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

      {/* Dev overlay: tiny spheres at raw node points (does not alter node logic) */}
      {ui?.showNodePoints && dotNodes.length > 0 && (
        <group>
          {dotNodes.map((n, i) => (
            <mesh key={`np-${i}`} position={[n.p[0], n.p[1], n.p[2]]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={n.id === 0 ? '#ff5555' : '#77e9ff'} depthWrite={false} transparent opacity={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {showNodes && (() => {
        // Collect quaternion data for batch logging
        const quaternionData = []
        // Per-ring dev log: summarize visual size used for this object/ring
        try {
          if (import.meta?.env?.DEV && (nodeData?.length || 0) > 0) {
            const n0 = nodeData[0]
            const profile0 = (n0?.stitchProfile) || STITCH_TYPES[n0?.stitchType] || STITCH_TYPES.sc
            const wMul = Number(profile0?.widthMul ?? 1.0)
            const hMul = Number(profile0?.heightMul ?? 1.0)
            const dMul = Number(profile0?.depthMul ?? 0.5)
            const scaleWidth = Math.max(0.0025, baseDims.width * wMul * 0.5)
            const scaleHeight = Math.max(0.0025, baseDims.height * hMul * 0.5)
            const scaleDepth = Math.max(0.0025, baseDims.width * dMul * 0.5)
            const meta = nodeRing0?.meta || {}
            const label = meta?.objectType || meta?.kind || 'unknown'
            // eslint-disable-next-line no-console
            console.log('[NodeSize]', {
              objectType: label,
              yarnLevel,
              stitchType: n0?.stitchType || 'sc',
              baseDims,
              multipliers: { widthMul: wMul, heightMul: hMul, depthMul: dMul },
              visualScale: { width: scaleWidth, height: scaleHeight, depth: scaleDepth },
              ringNodes: nodeData.length,
            })
          }
        } catch (_) {}
        
        const OrientedNode = ({ position, tangent, normal, quaternion, theta, idx, nodeId, stitchType, stitchProfile }) => {
          const ref = useRef()
          
          // Calculate scale based on this node's stitch type
          const profile = stitchProfile || STITCH_TYPES[stitchType] || STITCH_TYPES.sc
          
          // Ensure profile exists and has required properties
          if (!profile || typeof profile.widthMul === 'undefined') {
            console.error('Invalid stitch profile for node', idx, 'stitchType:', stitchType, 'profile:', profile)
            return <mesh ref={ref} position={position} scale={[0.01, 0.01, 0.01]}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshStandardMaterial color={0xff0000} roughness={0.55} metalness={0.05} />
            </mesh>
          }
          
          const scaledWidth = baseDims.width * (profile.widthMul ?? 1.0)
          const scaledHeight = baseDims.height * (profile.heightMul ?? 1.0)
          const scaledDepth = baseDims.width * (profile.depthMul ?? 0.5)
          
          // Map dimensions to render scale in scene units
          const scaleWidth = Math.max(0.0025, scaledWidth * 0.5)
          const scaleHeight = Math.max(0.0025, scaledHeight * 0.5)
          const scaleDepth = Math.max(0.0025, scaledDepth * 0.5)

          // Debug stitch type for first few nodes
          if (import.meta?.env?.DEV && idx < 3) {
            console.log(`[Node ${idx}] stitchType: ${stitchType}, profile:`, profile, `scale: ${scaleWidth.toFixed(4)}x${scaleHeight.toFixed(4)}x${scaleDepth.toFixed(4)}`)
          }
          
          useLayoutEffect(() => {
            if (!ref.current) return
            if (Array.isArray(quaternion) && quaternion.length === 4) {
              // Use baked quaternion
              ref.current.quaternion.fromArray(quaternion)
              quaternionData.push({ idx, quaternion, theta })

              // DEBUG: Log quaternion application for first 3 nodes
              if (import.meta?.env?.DEV && idx < 3) {
                console.log(`[NodeViewer] Applied quaternion to node ${idx}:`, {
                  quaternion,
                  theta,
                  thetaDeg: theta ? THREE.MathUtils.radToDeg(theta) : null,
                  position: [position.x, position.y, position.z],
                })
              }

              // COMPREHENSIVE DEBUG: Track first and last layer node 0 quaternions
              if (import.meta?.env?.DEV && idx === 0 && typeof window !== 'undefined') {
                const layerY = nodeRing0?.meta?.y
                if (layerY === window.__FIRST_LAYER_Y_VIEWER) {
                  console.log('[NodeViewer] FIRST LAYER - Applied quaternion to mesh:', {
                    layerY,
                    quaternion,
                    theta,
                    thetaDeg: theta ? THREE.MathUtils.radToDeg(theta) : null,
                    position: [position.x, position.y, position.z],
                  })
                }
                if (layerY === window.__LAST_LAYER_Y_VIEWER) {
                  console.log('[NodeViewer] LAST LAYER - Applied quaternion to mesh:', {
                    layerY,
                    quaternion,
                    theta,
                    thetaDeg: theta ? THREE.MathUtils.radToDeg(theta) : null,
                    position: [position.x, position.y, position.z],
                  })
                }
              }
            } else if (tangent && normal) {
              const q = getQuaternionFromTN(tangent, normal, 0)
              ref.current.quaternion.copy(q)
              quaternionData.push({ idx, quaternion: q.toArray(), theta: 0, type: 'fallback' })

              // DEBUG: Log fallback quaternion
              if (import.meta?.env?.DEV && idx < 3) {
                console.log(`[NodeViewer] Applied FALLBACK quaternion to node ${idx}:`, {
                  quaternion: q.toArray(),
                  tangent: [tangent.x, tangent.y, tangent.z],
                  normal: [normal.x, normal.y, normal.z],
                })
              }
            } else {
              // DEBUG: Log missing quaternion data
              if (import.meta?.env?.DEV && idx < 3) {
                console.warn(`[NodeViewer] Node ${idx} has NO quaternion or tangent/normal data!`)
              }
            }
            // Attach axes helper for node id == 0 (per-ring debug)
            try {
              const { ui } = useNodeStore.getState()
              if (ui?.showAxesHelper && nodeId === 0 && !ref.current.userData?.axesHelper) {
                const helper = new THREE.AxesHelper(0.6)
                ref.current.add(helper)
                ref.current.userData = { ...(ref.current.userData || {}), axesHelper: helper }
              } else if (!ui?.showAxesHelper && ref.current.userData?.axesHelper) {
                ref.current.remove(ref.current.userData.axesHelper)
                ref.current.userData.axesHelper = null
              }
            } catch (_) {}
          }, [quaternion, tangent, normal, theta, idx])
          return (
            <mesh ref={ref} position={position} scale={[scaleWidth, scaleHeight, scaleDepth]} raycast={null} name="Node">
              <sphereGeometry args={[1, 12, 12]} />
              <meshStandardMaterial color={profile.color ?? 0x1f77b4} roughness={0.55} metalness={0.05} />
            </mesh>
          )
        }

        const nodes = nodeData.map((n, i) => (
          <OrientedNode 
            key={`node-${i}`} 
            position={n.position} 
            tangent={n.tangent} 
            normal={n.normal} 
            quaternion={n.quaternion} 
            theta={n.theta} 
            idx={i} 
            nodeId={n.id}
            stitchType={n.stitchType}
            stitchProfile={n.stitchProfile}
          />
        ))

        // Batch log quaternion data instead of individual logs
        try {
          if (import.meta?.env?.DEV && quaternionData.length > 0) {
            console.log(`[Quaternions] Batch: ${quaternionData.length} nodes`, quaternionData)
          }
        } catch (_) {}

        // Debug stitch types
        try {
          if (import.meta?.env?.DEV && nodeData.length > 0) {
            const stitchTypes = nodeData.map(n => ({ id: n.id, stitchType: n.stitchType, hasProfile: !!n.stitchProfile }))
            console.log(`[StitchTypes] Nodes:`, stitchTypes)
          }
        } catch (_) {}

        return nodes
      })()}

      {/* Index labels (independent toggle) */}
      {ui?.showNodeIndices && nodeData.map(({ position, stitchType, stitchProfile }, i) => {
        const profile = stitchProfile || STITCH_TYPES[stitchType] || STITCH_TYPES.sc
        
        // Safety check for profile
        if (!profile || typeof profile.heightMul === 'undefined') {
          return null
        }
        
        const scaledHeight = baseDims.height * (profile.heightMul ?? 1.0)
        const scaleHeight = Math.max(0.0025, scaledHeight * 0.5)
        return (
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


