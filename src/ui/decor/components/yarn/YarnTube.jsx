import React, { useMemo } from 'react'
import * as THREE from 'three'
import { calculateYarnBendOffset } from './yarnUtils'
import { calculateEllipsoidOrbitalPath } from './ellipsoidOrbitalUtils'
import { calculateConeOrbitalPath } from './coneOrbitalUtils'

const YarnTube = ({ start, end, radius = 0.06, color = null, id = null, selected = false, onSelect = null, onDelete = null, nodeDepth = null, orbitalDistance = 0.15, center = null, sourceObject = null, curvature = 0.0 }) => {
    const curve = useMemo(() => {
        const a = new THREE.Vector3(...start)
        const b = new THREE.Vector3(...end)
        
        console.log('🟡 YarnTube curve calculation:', {
            start: a,
            end: b,
            sourceObject: sourceObject,
            orbitalDistance: orbitalDistance
        })
        
        // Use shape-specific orbital logic if source object is available
        if (sourceObject) {
            console.log('🟡 Using shape-specific orbital path for:', sourceObject.type, 'with curvature:', curvature)
            
            if (sourceObject.type === 'cone') {
                const orbitalPoints = calculateConeOrbitalPath(a, b, sourceObject, orbitalDistance, curvature)
                return new THREE.CatmullRomCurve3(orbitalPoints)
            } else if (sourceObject.type === 'sphere') {
                const orbitalPoints = calculateEllipsoidOrbitalPath(a, b, sourceObject, orbitalDistance, curvature)
                return new THREE.CatmullRomCurve3(orbitalPoints)
            } else {
                // For other object types, use ellipsoid as fallback
                console.log('🟡 Using ellipsoid orbital path as fallback for object type:', sourceObject.type)
                const orbitalPoints = calculateEllipsoidOrbitalPath(a, b, sourceObject, orbitalDistance, curvature)
                return new THREE.CatmullRomCurve3(orbitalPoints)
            }
        }
        
        console.log('🟡 Falling back to sphere orbital path')
        
        // Fallback to original sphere-based logic if no source object
        const sphereCenter = (() => {
            if (center && Array.isArray(center) && center.length === 3) {
                return new THREE.Vector3(...center)
            }
            return new THREE.Vector3(0, 0, 0)
        })()
        
        // Create orbital surface points - yarn follows an invisible surface at consistent distance
        const createOrbitalPoint = (point) => {
            const outwardDir = point.clone().sub(sphereCenter).normalize()
            return point.clone().add(outwardDir.multiplyScalar(orbitalDistance))
        }
        
        // Create orbital yarn that NEVER cuts through the object
        const orbitalPoints = []

        // Get the radius of the main sphere (use average of start and end distances)
        const mainSphereRadius = (a.distanceTo(sphereCenter) + b.distanceTo(sphereCenter)) / 2

        // Calculate directions from center to start and end points
        const startDir = a.clone().sub(sphereCenter).normalize()
        const endDir = b.clone().sub(sphereCenter).normalize()

        // Create the orbital sphere (concentric, larger by orbital distance)
        const orbitalSphereRadius = mainSphereRadius + orbitalDistance

        // Find the plane that contains both start and end points
        const planeNormal = startDir.clone().cross(endDir).normalize()

        // Create a coordinate system in the plane
        const planeVec1 = startDir.clone()
        const planeVec2 = planeNormal.clone().cross(planeVec1).normalize()

        // Generate points on the orbital sphere in that plane
        const numOrbitalPoints = 9
        const orbitalArcPoints = []

        for (let i = 0; i < numOrbitalPoints; i++) {
            const angle = (i / (numOrbitalPoints - 1)) * Math.PI // 180 degrees

            // Create point on orbital sphere
            const orbitalPoint = sphereCenter.clone()
                .add(planeVec1.clone().multiplyScalar(Math.cos(angle) * orbitalSphereRadius))
                .add(planeVec2.clone().multiplyScalar(Math.sin(angle) * orbitalSphereRadius))

            orbitalArcPoints.push(orbitalPoint)
        }

        // Find the orbital points closest to start and end directions
        let startOrbitalIndex = 0
        let endOrbitalIndex = numOrbitalPoints - 1
        let minStartAngle = Infinity
        let minEndAngle = Infinity

        for (let i = 0; i < orbitalArcPoints.length; i++) {
            const orbitalDir = orbitalArcPoints[i].clone().sub(sphereCenter).normalize()
            const startAngle = startDir.angleTo(orbitalDir)
            const endAngle = endDir.angleTo(orbitalDir)

            if (startAngle < minStartAngle) {
                minStartAngle = startAngle
                startOrbitalIndex = i
            }
            if (endAngle < minEndAngle) {
                minEndAngle = endAngle
                endOrbitalIndex = i
            }
        }

        // Build the curve: start -> transition -> orbital arc -> transition -> end
        orbitalPoints.push(a.clone()) // Start at surface

        // Create smooth transition from start point to orbital arc
        const arcStart = orbitalArcPoints[startOrbitalIndex]
        const numTransitionPoints = 2

        for (let i = 0; i < numTransitionPoints; i++) {
            const t = (i + 1) / (numTransitionPoints + 1)
            const transitionPoint = a.clone().lerp(arcStart, t * 0.8) // 80% towards orbital
            orbitalPoints.push(transitionPoint)
        }

        // Add the relevant orbital arc section
        const arcStartIndex = Math.min(startOrbitalIndex, endOrbitalIndex)
        const arcEndIndex = Math.max(startOrbitalIndex, endOrbitalIndex)

        for (let i = arcStartIndex; i <= arcEndIndex; i++) {
            orbitalPoints.push(orbitalArcPoints[i])
        }

        // Create smooth transition from orbital arc to end point
        const arcEnd = orbitalArcPoints[endOrbitalIndex]

        for (let i = 0; i < numTransitionPoints; i++) {
            const t = (i + 1) / (numTransitionPoints + 1)
            const transitionPoint = arcEnd.clone().lerp(b, t) // From orbital to surface
            orbitalPoints.push(transitionPoint)
        }

        orbitalPoints.push(b.clone()) // End at surface
        
        return new THREE.CatmullRomCurve3(orbitalPoints)
    }, [start, end, orbitalDistance, sourceObject, curvature])

    const tubular = useMemo(() => {
        return new THREE.TubeGeometry(curve, 32, radius, 12, false) // Higher resolution for smoother curves
    }, [curve, radius])

    // Generate yarn color based on ID for variety
    const yarnColor = useMemo(() => {
        if (color) return color
        
        // Yarn color palette - warm, natural colors
        const yarnColors = [
            0xff6b9d, // Pink
            0x9d6bff, // Purple  
            0x6b9dff, // Blue
            0x6bff9d, // Green
            0xff9d6b, // Orange
            0xffff6b, // Yellow
            0xff6b6b, // Red
            0x6bffff, // Cyan
            0xc06bff, // Violet
            0xff6bc0, // Magenta
        ]
        
        // Use ID to consistently pick same color for same yarn
        const colorIndex = id ? (id % yarnColors.length) : Math.floor(Math.random() * yarnColors.length)
        return yarnColors[colorIndex]
    }, [color, id])

    const handleClick = (e) => {
        e.stopPropagation()
        if (e.shiftKey && onDelete) {
            onDelete(id)
        } else if (onSelect) {
            onSelect(id)
        }
    }

    return (
        <group>
            {/* Main yarn tube */}
            <mesh 
                geometry={tubular} 
                name="YarnTube"
                onClick={handleClick}
                onPointerOver={(e) => {
                    e.stopPropagation()
                    document.body.style.cursor = 'pointer'
                }}
                onPointerOut={(e) => {
                    e.stopPropagation()
                    document.body.style.cursor = 'default'
                }}
            >
                <meshStandardMaterial 
                    color={selected ? 0xffffff : yarnColor}
                    roughness={0.85} 
                    metalness={0.01}
                    emissive={selected ? yarnColor : 0x000000}
                    emissiveIntensity={selected ? 0.3 : 0}
                    transparent={false}
                />
            </mesh>
            
            {/* Selection highlight */}
            {selected && (
                <mesh geometry={tubular} name="YarnHighlight">
                    <meshBasicMaterial 
                        color={0xffffff}
                        transparent
                        opacity={0.2}
                        depthTest={false}
                    />
                </mesh>
            )}
        </group>
    )
}

export default YarnTube


