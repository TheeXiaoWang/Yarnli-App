import React, { useMemo } from 'react'
import * as THREE from 'three'
import YarnTube from './YarnTube'
import { calculateNodeDepth } from './yarnUtils'

const YarnList = ({ yarns, pendingYarnStart, hoverPreview, selectedYarnId, onSelectYarn, onDeleteYarn, settings, orbitalDistance, center, sourceObject = null }) => {
    // Calculate node depth based on current settings
    const nodeDepth = useMemo(() => {
        return calculateNodeDepth(settings)
    }, [settings])

    // Create preview yarn curve when hovering over potential end point
    const previewCurve = useMemo(() => {
        if (!pendingYarnStart || !hoverPreview?.position) return null
        
        const start = new THREE.Vector3(...pendingYarnStart)
        const end = new THREE.Vector3(...hoverPreview.position)
        const C = Array.isArray(center) ? new THREE.Vector3(...center) : new THREE.Vector3(0,0,0)
        
        // Use same orbital logic as YarnTube
        const sphereCenter = C
        
        const createOrbitalPoint = (point) => {
            const outwardDir = point.clone().sub(sphereCenter).normalize()
            return point.clone().add(outwardDir.multiplyScalar(orbitalDistance))
        }
        
        // Create preview orbital yarn that NEVER cuts through the object
        const orbitalPoints = []

        // Get the radius of the main sphere (use average of start and end distances)
        const mainSphereRadius = (start.distanceTo(sphereCenter) + end.distanceTo(sphereCenter)) / 2

        // Calculate directions from center to start and end points
        const startDir = start.clone().sub(sphereCenter).normalize()
        const endDir = end.clone().sub(sphereCenter).normalize()

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
        orbitalPoints.push(start.clone()) // Start at surface

        // Create smooth transition from start point to orbital arc
        const arcStart = orbitalArcPoints[startOrbitalIndex]
        const numTransitionPoints = 2

        for (let i = 0; i < numTransitionPoints; i++) {
            const t = (i + 1) / (numTransitionPoints + 1)
            const transitionPoint = start.clone().lerp(arcStart, t * 0.8) // 80% towards orbital
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
            const transitionPoint = arcEnd.clone().lerp(end, t) // From orbital to surface
            orbitalPoints.push(transitionPoint)
        }

        orbitalPoints.push(end.clone()) // End at surface
        
        return new THREE.CatmullRomCurve3(orbitalPoints)
    }, [pendingYarnStart, hoverPreview, orbitalDistance])

    const previewGeometry = useMemo(() => {
        if (!previewCurve) return null
        return new THREE.TubeGeometry(previewCurve, 24, 0.04, 8, false)
    }, [previewCurve])

    return (
        <>
            {/* Enhanced pending yarn start marker */}
            {pendingYarnStart && (
                <group>
                    {/* Pulsing sphere */}
                    <mesh position={pendingYarnStart}>
                        <sphereGeometry args={[0.08, 16, 16]} />
                        <meshStandardMaterial 
                            color={0xffaa00} 
                            emissive={0xaa6600} 
                            emissiveIntensity={0.8}
                            transparent
                            opacity={0.9}
                        />
                    </mesh>
                    
                    {/* Outer glow ring */}
                    <mesh position={pendingYarnStart}>
                        <ringGeometry args={[0.12, 0.16, 16]} />
                        <meshBasicMaterial 
                            color={0xffaa00} 
                            transparent 
                            opacity={0.3}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            )}

            {/* Preview yarn line when hovering */}
            {previewGeometry && (
                <mesh geometry={previewGeometry}>
                    <meshStandardMaterial 
                        color={0xff66cc} 
                        transparent 
                        opacity={0.6}
                        roughness={0.65} 
                        metalness={0.05}
                    />
                </mesh>
            )}

            {/* Completed yarns */}
            {yarns.map((y) => (
                <YarnTube 
                    key={`yarn-${y.id}`} 
                    id={y.id}
                    start={y.start} 
                    end={y.end} 
                    radius={y.radius}
                    nodeDepth={nodeDepth}
                    orbitalDistance={orbitalDistance}
                    center={center}
                    sourceObject={sourceObject}
                    curvature={y.curvature || 0.0}
                    selected={selectedYarnId === y.id}
                    onSelect={onSelectYarn}
                    onDelete={onDeleteYarn}
                />
            ))}
        </>
    )
}

export default YarnList
