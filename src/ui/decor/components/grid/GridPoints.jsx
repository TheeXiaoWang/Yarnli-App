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
    const [isRotating, setIsRotating] = React.useState(false)
    const velocityHistory = React.useRef([])
    const lastMovementTime = React.useRef(0)
    const isStoppingRef = React.useRef(false)
    const [projectedNdc, setProjectedNdc] = React.useState(null) // Float32Array [x,y,z] per point
    const tilesRef = React.useRef(null) // { bins, cols, rows, tileSize, pxpy, facing }
    const mouseRef = React.useRef({ x: 0, y: 0 })
    const framePendingRef = React.useRef(false)
    const [visiblePoints, setVisiblePoints] = React.useState([])
    const lastMousePxRef = React.useRef({ x: Infinity, y: Infinity })
    const lastHoverIdRef = React.useRef(null)
    const lastHoverDistRef = React.useRef(Infinity)
    const lastHoverChangeAtRef = React.useRef(0)
    const spherePropsRef = React.useRef({ center: new THREE.Vector3(), radius: 1 })
    const computeTokenRef = React.useRef(0)
    const hoverAnchorPxRef = React.useRef({ x: 0, y: 0 })
    
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
                                t: 0.5,  // Midpoint interpolation
                                sourceObject: selectedObject,  // Pass source object info for yarn calculations
                                opacity: 0.0  // Default opacity (will be updated by gradient logic)
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
            if (isRotating) return
            const rect = gl.domElement.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            mouseRef.current = { x, y }
            setMousePos(mouseRef.current) // keep state for deps when needed
            // Skip recompute if mouse moved less than 1.5px since last run
            const mx = (x * 0.5 + 0.5) * Math.max(1, size.width)
            const my = (1 - (y * 0.5 + 0.5)) * Math.max(1, size.height)
            const dx = mx - lastMousePxRef.current.x
            const dy = my - lastMousePxRef.current.y
            const dist2 = dx*dx + dy*dy
            if (dist2 < 2.25) return
            lastMousePxRef.current = { x: mx, y: my }
            if (!framePendingRef.current) {
                framePendingRef.current = true
                requestAnimationFrame(() => {
                    framePendingRef.current = false
                    const token = ++computeTokenRef.current
                    runHoverCompute(token)
                })
            }
        }
        gl.domElement.addEventListener('mousemove', handleMouseMove, { passive: true })
        return () => gl.domElement.removeEventListener('mousemove', handleMouseMove)
    }, [gl, isRotating])
    
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

    // Compute and cache NDC projection for all grid points when camera becomes still
    const computeProjectionCache = React.useCallback(() => {
        if (!camera || !Array.isArray(gridPoints) || gridPoints.length === 0) {
            setProjectedNdc(null)
            tilesRef.current = null
            return
        }
        const out = new Float32Array(gridPoints.length * 3)
        const tmp = new THREE.Vector3()
        const pxpy = new Float32Array(gridPoints.length * 2)
        const facing = new Float32Array(gridPoints.length)
        const camDir = camera.getWorldDirection(new THREE.Vector3())
        for (let i = 0; i < gridPoints.length; i++) {
            const p = gridPoints[i].position
            if (Array.isArray(p) && p.length === 3) {
                tmp.set(p[0], p[1], p[2]).project(camera)
                out[i * 3 + 0] = tmp.x
                out[i * 3 + 1] = tmp.y
                out[i * 3 + 2] = tmp.z
                // Convert to screen pixels for tiling
                const sx = (tmp.x * 0.5 + 0.5) * Math.max(1, size.width)
                const sy = (1 - (tmp.y * 0.5 + 0.5)) * Math.max(1, size.height)
                pxpy[i * 2 + 0] = sx
                pxpy[i * 2 + 1] = sy
                // Facing metric: -normal · camDir
                const nrm = new THREE.Vector3(p[0], p[1], p[2]).sub(sphereCenter).normalize()
                facing[i] = Math.max(-1, Math.min(1, -nrm.dot(camDir)))
            } else {
                out[i * 3 + 0] = 999
                out[i * 3 + 1] = 999
                out[i * 3 + 2] = 999
                pxpy[i * 2 + 0] = 1e9
                pxpy[i * 2 + 1] = 1e9
                facing[i] = -1
            }
        }
        setProjectedNdc(out)
        // Build screen-space tiles: choose size proportional to selection radius
        const baseTile = Math.max(24, Math.floor((selectionRadiusPx || 50) * 0.8))
        const tileSize = baseTile
        const cols = Math.max(1, Math.ceil(Math.max(1, size.width) / tileSize))
        const rows = Math.max(1, Math.ceil(Math.max(1, size.height) / tileSize))
        const bins = new Array(cols * rows)
        for (let b = 0; b < bins.length; b++) bins[b] = []
        for (let i = 0; i < gridPoints.length; i++) {
            const z = out[i * 3 + 2]
            if (z < -1 || z > 1) continue
            const sx = pxpy[i * 2 + 0]
            const sy = pxpy[i * 2 + 1]
            if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue
            let c = Math.floor(sx / tileSize)
            let r = Math.floor(sy / tileSize)
            if (c < 0 || r < 0 || c >= cols || r >= rows) continue
            bins[r * cols + c].push(i)
        }
        tilesRef.current = { bins, cols, rows, tileSize, pxpy, facing }

        // Compute average radius for fast sphere intersection during hover
        let rSum = 0, rCount = 0
        const c = new THREE.Vector3(...centerApprox)
        for (let i = 0; i < Math.min(gridPoints.length, 200); i++) { // sample up to 200
            const p = gridPoints[i].position
            if (Array.isArray(p) && p.length === 3) {
                rSum += c.distanceTo(new THREE.Vector3(p[0], p[1], p[2]))
                rCount++
            }
        }
        const avgR = rCount > 0 ? rSum / rCount : 1
        spherePropsRef.current = { center: c, radius: avgR }
    }, [camera, gridPoints, size.width, size.height])

    // Recompute when camera stops rotating or grid points change
    React.useEffect(() => {
        if (!isRotating) computeProjectionCache()
    }, [isRotating, computeProjectionCache])

    React.useEffect(() => {
        // Also recompute when grid points change while still
        if (!isRotating) computeProjectionCache()
    }, [gridPoints, isRotating, computeProjectionCache])

    const runHoverCompute = React.useCallback((token) => {
        // Don't show any grid points when felt tool is active
        if (tool === 'felt') {
            setVisiblePoints([])
            setHoverPreview?.(null)
            setHoveredId?.(null)
            return
        }
        
        // During rotation OR while stopping, return empty array and don't run expensive calculations
        if (isRotating || isStoppingRef.current) {
            setVisiblePoints([])
            setHoverPreview?.(null)
            setHoveredId?.(null)
            return
        }
        
        if (!camera) { 
            setVisiblePoints(gridPoints)
            setHoverPreview?.(null)
            setHoveredId?.(null)
            return 
        }

        // If "Show all grid points" is enabled, bypass all filtering
        if (showAllGridPoints) {
            setVisiblePoints(gridPoints)
            return
        }

        // If we have a projection cache, use fast 2D NDC distance
        if (projectedNdc && projectedNdc.length === gridPoints.length * 3) {
            const maxK = 5
            const radiusPx = (selectionRadiusPx || 50)
            // Use screen-space tiles when available
            const tiles = tilesRef.current

            // Fixed-size top-K array
            const topIdx = new Int32Array(maxK).fill(-1)
            const topScore = new Float32Array(maxK).fill(1e9)

            // Precompute camera forward once and reuse temp vectors
            const camDir = camera.getWorldDirection(new THREE.Vector3())
            const tmp = new THREE.Vector3()
            const nrm = new THREE.Vector3()

            const considerIndex = (i) => {
                const x = projectedNdc[i * 3 + 0]
                const y = projectedNdc[i * 3 + 1]
                const z = projectedNdc[i * 3 + 2]
                if (!Number.isFinite(x) || !Number.isFinite(y) || z < -1 || z > 1) return

                // Face the camera
                if (tiles && tiles.facing && tiles.facing[i] <= 0.1) return

                // Convert mouse NDC to pixels
                const sx = (x * 0.5 + 0.5) * Math.max(1, size.width)
                const sy = (1 - (y * 0.5 + 0.5)) * Math.max(1, size.height)
                const mx = (mousePos.x * 0.5 + 0.5) * Math.max(1, size.width)
                const my = (1 - (mousePos.y * 0.5 + 0.5)) * Math.max(1, size.height)
                const dx = sx - mx
                const dy = sy - my
                const d2 = dx * dx + dy * dy
                if (d2 > radiusPx * radiusPx) return

                if (d2 >= topScore[maxK - 1]) return
                let j = maxK - 1
                while (j > 0 && d2 < topScore[j - 1]) {
                    topScore[j] = topScore[j - 1]
                    topIdx[j] = topIdx[j - 1]
                    j--
                }
                topScore[j] = d2
                topIdx[j] = i
            }

            if (tiles) {
                const mx = (mousePos.x * 0.5 + 0.5) * Math.max(1, size.width)
                const my = (1 - (mousePos.y * 0.5 + 0.5)) * Math.max(1, size.height)
                const { bins, cols, rows, tileSize, pxpy } = tiles
                const tc = Math.floor(mx / tileSize)
                const tr = Math.floor(my / tileSize)
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const r = tr + dr
                        const c = tc + dc
                        if (r < 0 || c < 0 || r >= rows || c >= cols) continue
                        const list = bins[r * cols + c]
                        for (let k = 0; k < list.length; k++) considerIndex(list[k])
                    }
                }
            } else {
                for (let i = 0; i < gridPoints.length; i++) considerIndex(i)
            }

            // Build candidate list with pixel distance and world ray distance for clickability
            // Build a stable 3D ray that sticks to the sphere surface to avoid jitter at grazing angles
            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(mousePos, camera)
            const sphere = new THREE.Sphere(spherePropsRef.current.center, spherePropsRef.current.radius * 1.05)
            const hit = new THREE.Vector3()
            const hasHit = raycaster.ray.intersectSphere(sphere, hit)
            if (hasHit) {
                // Re-aim the ray to start from camera toward the sphere hit point (stabilizes closest-point math)
                const dir = hit.clone().sub(raycaster.ray.origin).normalize()
                raycaster.ray.direction.copy(dir)
            }
            const mx = (mousePos.x * 0.5 + 0.5) * Math.max(1, size.width)
            const my = (1 - (mousePos.y * 0.5 + 0.5)) * Math.max(1, size.height)
            const worldRadius = (selectionRadiusPx || 50) / 50.0
            const candidates = []
            for (let k = 0; k < maxK; k++) {
                const idx = topIdx[k]
                if (idx < 0) continue
                const x = projectedNdc[idx * 3 + 0]
                const y = projectedNdc[idx * 3 + 1]
                const sx = (x * 0.5 + 0.5) * Math.max(1, size.width)
                const sy = (1 - (y * 0.5 + 0.5)) * Math.max(1, size.height)
                const dx = sx - mx
                const dy = sy - my
                const d2px = dx * dx + dy * dy
                const pWorld = new THREE.Vector3(...gridPoints[idx].position)
                const rayToPoint = pWorld.clone().sub(raycaster.ray.origin)
                const projectedLength = rayToPoint.dot(raycaster.ray.direction)
                let dWorld = Infinity
                if (projectedLength >= 0) {
                    const closest = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(projectedLength))
                    dWorld = pWorld.distanceTo(closest)
                }
                candidates.push({ idx, d2px, dWorld })
            }
            // Filter by clickability (world distance) to avoid preview in non-clickable zones
            const clickable = candidates.filter(c => c.dWorld <= worldRadius)
            clickable.sort((a,b)=>a.d2px-b.d2px)
            
            // If no clickable candidates, clear everything
            if (clickable.length === 0) {
                if (token != null && token !== computeTokenRef.current) return
                setVisiblePoints([])
                setHoveredId?.(null)
                setHoverPreview?.(null)
                lastHoverIdRef.current = null
                return
            }
            // Temporal hysteresis: prefer last hover if close in px and not much worse in world distance
            const stickPx2 = 100 // ~10px tolerance
            const stickWorld = 0.25 * ((selectionRadiusPx || 50) / 50.0)
            let chosen = clickable[0]
            const lastIdx = clickable.find(c => gridPoints[c.idx].id === lastHoverIdRef.current)
            if (lastIdx && chosen) {
                const pxOk = lastIdx.d2px <= chosen.d2px + stickPx2
                const worldOk = (lastIdx.dWorld - chosen.dWorld) <= stickWorld
                // Break hysteresis if mouse moved far from the anchor point of last commit
                const mx2 = (mousePos.x * 0.5 + 0.5) * Math.max(1, size.width)
                const my2 = (1 - (mousePos.y * 0.5 + 0.5)) * Math.max(1, size.height)
                const ddx = mx2 - hoverAnchorPxRef.current.x
                const ddy = my2 - hoverAnchorPxRef.current.y
                const movedFar = (ddx*ddx + ddy*ddy) > 400 // >20px
                if (!movedFar && pxOk && worldOk) chosen = lastIdx
            }
            // Visible points are the clickable ones (up to 5)
            const result = clickable.slice(0, maxK).map(c => gridPoints[c.idx])
            if (token != null && token !== computeTokenRef.current) return
            if (result.length !== visiblePoints.length || result.some((p, i) => p.id !== visiblePoints[i]?.id)) {
                setVisiblePoints(result)
            }
            // Programmatic hover only if a clickable candidate exists
            const chosenPoint = chosen ? gridPoints[chosen.idx] : null
            lastHoverIdRef.current = chosenPoint?.id ?? null
            if (chosenPoint) {
                hoverAnchorPxRef.current = {
                    x: (mousePos.x * 0.5 + 0.5) * Math.max(1, size.width),
                    y: (1 - (mousePos.y * 0.5 + 0.5)) * Math.max(1, size.height)
                }
            }
            try {
                setHoveredId?.(lastHoverIdRef.current)
                if (tool === 'eyes' && chosenPoint) {
                    setHoverPreview?.({
                        position: chosenPoint.position,
                        normal: chosenPoint.normal,
                        ringTangent: chosenPoint.ringTangent,
                        quaternion: chosenPoint.quaternion
                    })
                } else {
                    setHoverPreview?.(null)
                }
            } catch (_) {}
            return
        }

        // Fallback to 3D method if cache missing
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mousePos, camera)
        const candidatePoints = []
        const camDir = camera.getWorldDirection(new THREE.Vector3())
        const nrm = new THREE.Vector3()
        for (const gp of gridPoints) {
            const pointPos = new THREE.Vector3(...gp.position)
            const cameraToPoint = pointPos.clone().sub(cameraPos)
            if (cameraToPoint.dot(camera.getWorldDirection(new THREE.Vector3())) < 0) continue
            // Face the camera gate
            nrm.copy(pointPos).sub(sphereCenter).normalize()
            const facing = -nrm.dot(camDir)
            if (facing <= 0.1) continue
            const rayToPoint = pointPos.clone().sub(raycaster.ray.origin)
            const projectedLength = rayToPoint.dot(raycaster.ray.direction)
            if (projectedLength < 0) continue
            const closestPointOnRay = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(projectedLength))
            const distanceToRay = pointPos.distanceTo(closestPointOnRay)
            const mouseRadius = (selectionRadiusPx || 50) / 50.0
            if (distanceToRay > mouseRadius) continue
            candidatePoints.push({ gridPoint: gp, distanceToMouse: distanceToRay })
        }
        const arr = candidatePoints.sort((a,b)=>a.distanceToMouse-b.distanceToMouse).slice(0,5).map(c=>c.gridPoint)
        if (token != null && token !== computeTokenRef.current) return
        setVisiblePoints(arr)
        try {
            const hoverId = arr[0]?.id ?? null
            setHoveredId?.(hoverId)
            if (tool === 'eyes' && arr[0]) {
                setHoverPreview?.({
                    position: arr[0].position,
                    normal: arr[0].normal,
                    ringTangent: arr[0].ringTangent,
                    quaternion: arr[0].quaternion
                })
            } else {
                setHoverPreview?.(null)
            }
            lastHoverIdRef.current = hoverId
        } catch (_) {}
    }, [gridPoints, cameraPos, camera, centerApprox, mousePos, selectionRadiusPx, sphereCenter, isRotating, showAllGridPoints, tool, projectedNdc, size.width, size.height])

    // Re-run compute when caches or settings change and we're still
    React.useEffect(() => {
        if (!isRotating) runHoverCompute()
    }, [projectedNdc, selectionRadiusPx, showAllGridPoints, isRotating, runHoverCompute])

    // Grid points are now filtered out at DecorScene level when felt tool is active
    
    if (!showGridPoints) return null

    return (
        <>
            {visiblePoints.map((gp) => (
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
                            console.log('Calling handleGridActivate with:', id, pos, norm, gp.ringTangent, gp.quaternion, gp.sourceObject)
                            handleGridActivate(id, pos, norm, gp.ringTangent, gp.quaternion, gp.sourceObject)
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
