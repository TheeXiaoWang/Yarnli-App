import React from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import ClickablePoint from './ClickablePoint'
import { computeGridPointsBetween } from './gridUtils'
import { useDecorStore } from '../../../../app/stores/decorStore'

// Helper function to get position at a specific angle around a ring using parametric interpolation
function getPositionAtAngle(nodes, targetAngle, center) {
    if (!nodes || nodes.length === 0) return null
    
    // Simple parametric approach: treat the ring as a closed loop
    // targetAngle from 0 to 2π maps to parameter t from 0 to 1
    const t = (targetAngle / (2 * Math.PI)) % 1
    
    // Find the position along the ring using parametric interpolation
    const nodeCount = nodes.length
    const segmentLength = 1.0 / nodeCount
    const segmentIndex = Math.floor(t * nodeCount)
    const localT = (t * nodeCount) - segmentIndex
    
    // Get the two nodes for interpolation
    const currentNode = nodes[segmentIndex]
    const nextNode = nodes[(segmentIndex + 1) % nodeCount]
    
    const currentPos = currentNode?.p || currentNode
    const nextPos = nextNode?.p || nextNode
    
    if (!currentPos || !nextPos) return null
    
    // Linear interpolation between the two nodes
    const currentVec = new THREE.Vector3(...currentPos)
    const nextVec = new THREE.Vector3(...nextPos)
    const interpolated = currentVec.clone().lerp(nextVec, localT)
    
    return [interpolated.x, interpolated.y, interpolated.z]
}

const GridPoints = ({
    allRings,
    centerApprox,
    axisDir,
    selectedObject,
    tool,
    showGridPoints,
    hoveredId,
    setHoveredId,
    handleGridActivate,
    setHoverPreview,
    eyeRadius = 0.12
}) => {
    const { 
        showGridVectors, 
        gridYawStartDeg, 
        gridYawEndDeg, 
        gridAngularOffsetDeg, 
        showOnlyNearGridPoints, 
        showAllGridPoints, 
        selectionRadiusPx 
    } = useDecorStore()
    
    const { camera, gl, size } = useThree()
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })
    const [cameraPos, setCameraPos] = React.useState(camera.position.clone())
    const [lastMouseUpdate, setLastMouseUpdate] = React.useState(0)
    const [isRotating, setIsRotating] = React.useState(false)
    const velocityHistory = React.useRef([])
    const lastMovementTime = React.useRef(0)
    const isStoppingRef = React.useRef(false)
    
    // Calculate dynamic sphere center based on selected object's position and scale
    const sphereCenter = React.useMemo(() => {
        if (selectedObject && selectedObject.type === 'sphere') {
            // For spheres: center = position, no additional offset needed
            return new THREE.Vector3(...selectedObject.position)
        } else if (selectedObject) {
            // For other objects: use their position as center
            return new THREE.Vector3(...selectedObject.position)
        } else {
            // Fallback: calculate from grid points or use origin
            if (centerApprox && Array.isArray(centerApprox)) {
                return new THREE.Vector3(...centerApprox)
            }
            return new THREE.Vector3(0, 0, 0)
        }
    }, [selectedObject, centerApprox])

    const gridPoints = React.useMemo(() => {
        const out = []
        let id = 1

        // ✅ Fallback if axisDir is undefined
        const safeAxisDir = axisDir
            ? [axisDir.x, axisDir.y, axisDir.z]
            : [0, 1, 0]

        // Sort rings by Y coordinate to position grid points between layers
        const sortedRings = [...allRings].sort((a, b) => (a.y || 0) - (b.y || 0))

        for (let ringIndex = 0; ringIndex < sortedRings.length; ringIndex++) {
            const currentRing = sortedRings[ringIndex]
            const nextRing = sortedRings[ringIndex + 1]
            
            if (nextRing) {
                // Generate grid points between current and next ring using spherical interpolation
                const currentNodes = currentRing.nodes || []
                const nextNodes = nextRing.nodes || []
                
                if (currentNodes.length > 0 && nextNodes.length > 0) {
                    // Use the larger ring to determine even spacing
                    const targetCount = Math.max(currentNodes.length, nextNodes.length)
                    
                    // Calculate the precise automatic offset to position grid points between nodes
                    // Above equator: align with nodes below (currentRing)
                    // Below equator: align with nodes above (nextRing)
                    const currentY = currentRing.y || 0
                    const nextY = nextRing.y || 0
                    const isAboveEquator = currentY > 0 // Assuming equator is at Y=0
                    
                    // Choose reference ring for alignment and calculate precise node angles
                    const referenceNodes = isAboveEquator ? currentNodes : nextNodes
                    let autoOffsetRadians = 0
                    
                    if (referenceNodes.length >= 2) {
                        // Calculate actual angular positions of first two nodes
                        const center = new THREE.Vector3(...centerApprox)
                        const firstNode = referenceNodes[0]
                        const secondNode = referenceNodes[1]
                        
                        const firstPos = firstNode?.p || firstNode
                        const secondPos = secondNode?.p || secondNode
                        
                        if (firstPos && secondPos) {
                            // Calculate angles of first two nodes
                            const firstVec = new THREE.Vector3(...firstPos).sub(center)
                            const secondVec = new THREE.Vector3(...secondPos).sub(center)
                            
                            const firstAngle = Math.atan2(firstVec.z, firstVec.x)
                            const secondAngle = Math.atan2(secondVec.z, secondVec.x)
                            
                            // Calculate the actual angular spacing between adjacent nodes
                            let angularSpacing = secondAngle - firstAngle
                            if (angularSpacing < 0) angularSpacing += 2 * Math.PI
                            if (angularSpacing > Math.PI) angularSpacing = 2 * Math.PI - angularSpacing
                            
                            // Offset by exactly half the angular spacing to be between nodes
                            autoOffsetRadians = angularSpacing / 2
                        }
                    }
                    
                    for (let gridIndex = 0; gridIndex < targetCount; gridIndex++) {
                        // Calculate evenly spaced angle around the ring with both auto and manual offset
                        const baseAngle = (gridIndex / targetCount) * 2 * Math.PI
                        const manualOffsetRadians = THREE.MathUtils.degToRad(gridAngularOffsetDeg)
                        const angle = baseAngle + autoOffsetRadians + manualOffsetRadians
                        
                        // Find interpolated positions at this angle for both rings
                        const currentPos = getPositionAtAngle(currentNodes, angle, centerApprox)
                        const nextPos = getPositionAtAngle(nextNodes, angle, centerApprox)
                        
                        if (currentPos && nextPos) {
                            // Interpolate position halfway between rings along the curved surface
                            const currentVec = new THREE.Vector3(...currentPos)
                            const nextVec = new THREE.Vector3(...nextPos)
                            const midPos = currentVec.clone().lerp(nextVec, 0.5)
                            
                            // Calculate normal at the interpolated position
                            const center = new THREE.Vector3(...centerApprox)
                            const normal = midPos.clone().sub(center).normalize()
                            
                            // Apply larger outward offset to make grid points visible in front of nodes
                            const offset = Math.max(0.05, eyeRadius * 0.3) // Increased offset
                            const finalPos = midPos.clone().add(normal.clone().multiplyScalar(offset))
                            // Calculate ring tangent for this interpolated position
                            const axisVec = new THREE.Vector3(...safeAxisDir).normalize()
                            let ringTangent = new THREE.Vector3().crossVectors(axisVec, normal)
                            if (ringTangent.lengthSq() < 1e-8) {
                                // Fallback if normal is parallel to axis
                                const ref = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
                                ringTangent = ref.clone().sub(normal.clone().multiplyScalar(ref.dot(normal)))
                            }
                            ringTangent.normalize()
                            
                            // Calculate quaternion using lookAt
                            const lookTarget = finalPos.clone().add(normal)
                            const m = new THREE.Matrix4().lookAt(finalPos, lookTarget, ringTangent)
                            const q = new THREE.Quaternion().setFromRotationMatrix(m)
                            const qFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
                            q.multiply(qFix)
                            
                            // Create grid point directly
                            const gridPoint = {
                                position: [finalPos.x, finalPos.y, finalPos.z],
                                normal: [normal.x, normal.y, normal.z],
                                ringTangent: [ringTangent.x, ringTangent.y, ringTangent.z],
                                quaternion: [q.x, q.y, q.z, q.w],
                                segmentIndex: gridIndex,
                                t: 0.5  // Midpoint interpolation
                            }
                            out.push({ id: id++, ...gridPoint })
                        }
                    }
                }
            }
        }
        return out
    }, [allRings, centerApprox, eyeRadius, axisDir])

    // Track camera movement and mouse position for dynamic filtering with throttling
    React.useEffect(() => {
        if (!gl?.domElement) return
        
        const handleMouseMove = (e) => {
            // Skip mouse updates during camera rotation
            if (isRotating) return
            
            const now = performance.now()
            // Throttle to 20fps (50ms between updates)
            if (now - lastMouseUpdate < 50) return
            
            const rect = gl.domElement.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            setMousePos({ x, y })
            setLastMouseUpdate(now)
        }
        
        // Use passive event for better performance
        gl.domElement.addEventListener('mousemove', handleMouseMove, { passive: true })
        return () => gl.domElement.removeEventListener('mousemove', handleMouseMove)
    }, [gl, lastMouseUpdate, isRotating])
    
    // Update camera position tracking and detect rotation
    React.useEffect(() => {
        if (!camera) return
        
        let lastCameraPos = camera.position.clone()
        let lastCameraQuat = camera.quaternion.clone()
        
        const interval = setInterval(() => {
            const now = performance.now()
            const currentPos = camera.position.clone()
            const currentQuat = camera.quaternion.clone()
            
            // Calculate movement magnitude
            const posDistance = currentPos.distanceTo(lastCameraPos)
            const rotAngle = Math.abs(currentQuat.angleTo(lastCameraQuat))
            const totalMovement = posDistance + rotAngle
            
            // Add to velocity history with timestamp
            velocityHistory.current.push({ movement: totalMovement, time: now })
            
            // Keep only last 5 samples (250ms of history at 20fps)
            if (velocityHistory.current.length > 5) {
                velocityHistory.current.shift()
            }
            
            // Calculate average velocity over recent history
            let avgVelocity = 0
            if (velocityHistory.current.length >= 2) {
                const recent = velocityHistory.current.slice(-3) // Last 3 samples
                avgVelocity = recent.reduce((sum, sample) => sum + sample.movement, 0) / recent.length
            }
            
            const isCurrentlyMoving = totalMovement > 0.001 || avgVelocity > 0.001
            
            if (isCurrentlyMoving) {
                lastMovementTime.current = now
                if (!isRotating) {
                    console.log('Starting rotation - velocity:', avgVelocity.toFixed(4))
                    setIsRotating(true)
                }
            } else {
                // Check if we've been still long enough
                const timeSinceMovement = now - lastMovementTime.current
                if (isRotating && timeSinceMovement > 30) { // Reduced to 30ms for faster response
                    console.log('Stopping rotation - still for:', timeSinceMovement, 'ms')
                    isStoppingRef.current = true
                    // Update camera position and wait one frame before showing grid points
                    setCameraPos(currentPos)
                    requestAnimationFrame(() => {
                        setIsRotating(false)
                        isStoppingRef.current = false
                    })
                    velocityHistory.current = [] // Clear history
                }
            }
            
            // Update cameraPos only when not rotating
            if (!isRotating) {
                setCameraPos(currentPos)
            }
            
            lastCameraPos = currentPos
            lastCameraQuat = currentQuat
        }, 50) // Check at 20fps
        
        return () => {
            clearInterval(interval)
        }
    }, [camera, isRotating])

    // Filter grid points based on camera view and mouse proximity
    const visibleGridPoints = React.useMemo(() => {
        //console.log('Grid useMemo running - isRotating:', isRotating, 'isStopping:', isStoppingRef.current)
        
        // Don't show any grid points when felt tool is active
        if (tool === 'felt') {
            return []
        }
        
        // During rotation OR while stopping, return empty array and don't run expensive calculations
        if (isRotating || isStoppingRef.current) {
            //console.log('Returning empty array due to rotation or stopping')
            return []
        }
        
        //console.log('Running expensive grid calculations')
        if (!camera) return gridPoints

        // If "Show all grid points" is enabled, bypass all filtering
        if (showAllGridPoints) {
            console.log('🌟 Showing ALL grid points - bypassing all filters!')
            return gridPoints
        }

        // Create raycaster from mouse position
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mousePos, camera)

        // Filter and sort grid points, then limit to 5 closest
        const candidatePoints = []

        for (const gp of gridPoints) {
            const pointPos = new THREE.Vector3(...gp.position)

            // Skip if behind camera
            const cameraToPoint = pointPos.clone().sub(cameraPos)
            if (cameraToPoint.dot(camera.getWorldDirection(new THREE.Vector3())) < 0) {
                continue // Behind camera
            }

            // GRID VECTOR VS CAMERA DIRECTION: Only show grid points where grid vectors point opposite to camera
            // Get camera viewing direction (where camera is looking)
            const cameraDirection = camera.getWorldDirection(new THREE.Vector3())

            // Calculate grid vector direction (same as current grid vector rendering)
            const gridVectorDirection = sphereCenter.clone().sub(pointPos).normalize().negate()

            // Test: if grid vector points generally opposite to camera direction, show it
            // Grid vector points outward from surface, camera direction points into scene
            // We want: gridVector dot (-cameraDirection) > threshold
            // This means the grid vector and the opposite of camera direction are aligned
            const dotProduct = gridVectorDirection.dot(cameraDirection.clone().negate())
            if (dotProduct <= 0.1) {
                continue // Grid vector doesn't point opposite to camera
            }

            // MOUSE PROXIMITY: Only show grid points near mouse cursor
            const rayToPoint = pointPos.clone().sub(raycaster.ray.origin)
            const rayDirection = raycaster.ray.direction
            const projectedLength = rayToPoint.dot(rayDirection)

            if (projectedLength < 0) continue // Behind camera

            const closestPointOnRay = raycaster.ray.origin.clone().add(rayDirection.clone().multiplyScalar(projectedLength))
            const distanceToRay = pointPos.distanceTo(closestPointOnRay)

            // Only show grid points within mouse radius (always enabled now)
            const mouseRadius = (selectionRadiusPx || 50) / 50.0 // Convert pixels to world units
            if (distanceToRay > mouseRadius) {
                continue // Too far from mouse cursor
            }

            // Add to candidates with distance for sorting
            candidatePoints.push({
                gridPoint: gp,
                distanceToMouse: distanceToRay
            })
        }

        // Sort by distance to mouse and take only the closest 5
        return candidatePoints
            .sort((a, b) => a.distanceToMouse - b.distanceToMouse)
            .slice(0, 5) // Limit to maximum 5 grid points
            .map(candidate => candidate.gridPoint)
    }, [gridPoints, cameraPos, camera, centerApprox, mousePos, selectionRadiusPx, sphereCenter, isRotating, showAllGridPoints, tool])

    // Grid points are now filtered out at DecorScene level when felt tool is active
    
    if (!showGridPoints) return null

    return (
        <>
            {visibleGridPoints.map((gp) => (
                <group key={`gp-${gp.id}`}>
                    <ClickablePoint
                        id={gp.id}
                        position={gp.position}
                        normal={gp.normal}
                        ringTangent={gp.ringTangent}
                        quaternion={gp.quaternion}
                        hovered={hoveredId === gp.id}
                        isUsed={useDecorStore.getState()?.hasUsedPoint?.(gp.id) || false}
                        onHover={(id) => setHoveredId(id)}
                        onUnhover={() => setHoveredId(null)}
                        onActivate={(id, pos, norm) => {
                            console.log('🟢 GridPoints onActivate called!')
                            console.log('Calling handleGridActivate with:', id, pos, norm, gp.ringTangent, gp.quaternion)
                            handleGridActivate(id, pos, norm, gp.ringTangent, gp.quaternion)
                        }}
                        onHoverEye={(pos, norm, ringTangent, quaternion) => {
                            // Only show eye preview when Eyes tool is selected
                            if (tool === 'eyes' && pos && norm) {
                                // Throttle preview updates to reduce lag
                                const now = performance.now()
                                if (!window._lastPreviewUpdate || now - window._lastPreviewUpdate > 100) {
                                    setHoverPreview({
                                        position: pos,
                                        normal: norm,
                                        ringTangent,
                                        quaternion
                                    })
                                    window._lastPreviewUpdate = now
                                }
                            } else {
                                setHoverPreview(null)
                            }
                        }}
                    />

                    {showGridVectors && (() => {
                        // 1) Start point: the grid point position in world space
                        const start = new THREE.Vector3(...gp.position)

                        // 2) Calculate direction outward from sphere center (same as eyes)
                        const dir = sphereCenter.clone().sub(start).normalize().negate()

                        // 4) Choose length and create end point
                        const length = Math.max(eyeRadius * 2, 0.06)
                        const end = start.clone().add(dir.multiplyScalar(length))

                        // 5) Create line geometry
                        const positions = new Float32Array([
                            start.x, start.y, start.z,
                            end.x, end.y, end.z
                        ])

                        // 6) Render the line
                        return (
                            <line renderOrder={1000} name="GridVector">
                                <bufferGeometry>
                                    <bufferAttribute
                                        attach="attributes-position"
                                        array={positions}
                                        count={2}
                                        itemSize={3}
                                    />
                                </bufferGeometry>
                                <lineBasicMaterial color={0x66ccff} depthTest={false} />
                            </line>
                        )
                    })()}
                </group>
            ))}
        </>
    )
}

export default GridPoints
