import * as THREE from 'three'

/**
 * Calculate orbital path around a cone source object
 * @param {THREE.Vector3} start - Start point on cone surface
 * @param {THREE.Vector3} end - End point on cone surface  
 * @param {Object} sourceObject - Source object with position, scale, rotation
 * @param {number} orbitalDistance - Distance to orbit from cone surface
 * @param {number} curvature - Additional curvature to apply to the path
 * @returns {THREE.Vector3[]} Array of points forming the orbital curve
 */
export function calculateConeOrbitalPath(start, end, sourceObject, orbitalDistance = 0.15, curvature = 0.0) {
    // Get cone properties from source object
    const coneCenter = new THREE.Vector3(...sourceObject.position)
    const coneScale = new THREE.Vector3(...sourceObject.scale)
    const coneRotation = new THREE.Euler(
        sourceObject.rotation[0] * (Math.PI / 180),
        sourceObject.rotation[1] * (Math.PI / 180),
        sourceObject.rotation[2] * (Math.PI / 180)
    )
    
    console.log('🟡 Cone orbital calculation:', {
        center: coneCenter,
        scale: coneScale,
        rotation: coneRotation,
        orbitalDistance
    })
    
    // Create transformation matrix for the cone
    const coneMatrix = new THREE.Matrix4()
    coneMatrix.compose(coneCenter, new THREE.Quaternion().setFromEuler(coneRotation), coneScale)
    
    // Create inverse matrix to transform points to cone local space
    const inverseMatrix = coneMatrix.clone().invert()
    
    /**
     * Get the closest point on cone surface to a given point
     * @param {THREE.Vector3} point - Point in world space
     * @returns {THREE.Vector3} Closest point on cone surface in world space
     */
    const getClosestPointOnCone = (point) => {
        // Transform point to cone local space
        const localPoint = point.clone().applyMatrix4(inverseMatrix)
        
        // Cone geometry: height 2 along Y (-1 to +1), base radius 1 at y=-1, apex at y=+1
        // Clamp Y to cone bounds
        const clampedY = Math.max(-1, Math.min(1, localPoint.y))
        
        // Calculate radius at this Y level: r = (1 - y) / 2 (linear from 1 at y=-1 to 0 at y=+1)
        const radiusAtY = (1 - clampedY) / 2
        
        if (radiusAtY <= 0.001) {
            // Near apex, just use the apex point
            const apexLocal = new THREE.Vector3(0, 1, 0)
            return apexLocal.applyMatrix4(coneMatrix)
        }
        
        // Project onto the circular cross-section at this Y level
        const radialDistance = Math.sqrt(localPoint.x * localPoint.x + localPoint.z * localPoint.z)
        
        let projectedLocal
        if (radialDistance > 0.001) {
            // Normalize and scale to cone radius at this Y
            const normalizedX = localPoint.x / radialDistance
            const normalizedZ = localPoint.z / radialDistance
            projectedLocal = new THREE.Vector3(
                normalizedX * radiusAtY,
                clampedY,
                normalizedZ * radiusAtY
            )
        } else {
            // Point is on the Y axis, place it on the edge
            projectedLocal = new THREE.Vector3(radiusAtY, clampedY, 0)
        }
        
        // Transform back to world space
        return projectedLocal.applyMatrix4(coneMatrix)
    }
    
    /**
     * Get the surface normal at a point on the cone
     * @param {THREE.Vector3} surfacePoint - Point on cone surface in world space
     * @returns {THREE.Vector3} Outward normal vector in world space
     */
    const getConeNormal = (surfacePoint) => {
        // Transform to local space
        const localPoint = surfacePoint.clone().applyMatrix4(inverseMatrix)
        
        // For a cone, the normal depends on the position
        const radiusAtY = (1 - localPoint.y) / 2
        
        if (radiusAtY <= 0.001) {
            // Near apex, normal points upward (along Y axis)
            const localNormal = new THREE.Vector3(0, 1, 0)
            localNormal.transformDirection(coneMatrix)
            return localNormal.normalize()
        }
        
        // For cone side surface, calculate normal
        // The cone surface can be parameterized, and the normal is perpendicular to the surface
        const radialDir = new THREE.Vector3(localPoint.x, 0, localPoint.z).normalize()
        
        // Cone slope: as we go up by 2 units (from y=-1 to y=+1), radius goes from 1 to 0
        // So slope in local coordinates is: dr/dy = -1/2
        // Normal has components in both radial and Y directions
        const slopeAngle = Math.atan2(0.5, 1) // atan2(radius change, height change)
        const normalY = Math.sin(slopeAngle)
        const normalRadial = Math.cos(slopeAngle)
        
        const localNormal = new THREE.Vector3(
            radialDir.x * normalRadial,
            normalY,
            radialDir.z * normalRadial
        ).normalize()
        
        // Transform normal back to world space
        localNormal.transformDirection(coneMatrix)
        return localNormal.normalize()
    }
    
    /**
     * Get orbital point at specified distance from cone surface
     * @param {THREE.Vector3} surfacePoint - Point on cone surface
     * @returns {THREE.Vector3} Point at orbital distance from surface
     */
    const getOrbitalPoint = (surfacePoint) => {
        const normal = getConeNormal(surfacePoint)
        return surfacePoint.clone().add(normal.multiplyScalar(orbitalDistance))
    }
    
    // Ensure start and end points are on cone surface
    const startSurface = getClosestPointOnCone(start)
    const endSurface = getClosestPointOnCone(end)
    
    console.log('🟡 Cone surface points:', {
        originalStart: start,
        startSurface: startSurface,
        originalEnd: end,
        endSurface: endSurface
    })
    
    // Get orbital points for start and end
    const startOrbital = getOrbitalPoint(startSurface)
    const endOrbital = getOrbitalPoint(endSurface)
    
    console.log('🟡 Cone orbital points:', {
        startOrbital: startOrbital,
        endOrbital: endOrbital
    })
    
    // Create cone-specific orbital path
    const orbitalPoints = []
    
    // Start at actual grid point (surface)
    orbitalPoints.push(start.clone())
    
    // Transform start and end points to cone local space to analyze the path type
    const startLocal = start.clone().applyMatrix4(inverseMatrix)
    const endLocal = end.clone().applyMatrix4(inverseMatrix)
    
    // Determine if this is primarily a vertical or horizontal connection
    const verticalDistance = Math.abs(endLocal.y - startLocal.y)
    const horizontalDistance = Math.sqrt(
        Math.pow(endLocal.x - startLocal.x, 2) + 
        Math.pow(endLocal.z - startLocal.z, 2)
    )
    
    // For cones, prefer more direct paths - reduce the threshold for vertical paths
    const isVerticalPath = verticalDistance > horizontalDistance * 0.3
    
    console.log('🟡 Cone path analysis:', {
        startLocal,
        endLocal,
        verticalDistance,
        horizontalDistance,
        isVerticalPath
    })
    
    // For cone: straight in middle, curved at connection points
    console.log('🟡 Using cone-specific path: straight middle, curved ends')
    
    // For cones, check if we should create a surface-aligned path
    const effectiveOrbitalDistance = Math.max(orbitalDistance * 0.4, 0.001) // Minimum offset to avoid z-fighting
    
    if (orbitalDistance < 0.02) {
        // SURFACE-ALIGNED PATH: Follow cone surface directly with minimal offset
        console.log('🟡 Creating surface-aligned cone path')
        
        // Create points that follow the cone's surface geometry directly
        for (let i = 1; i <= 4; i++) {
            const t = i / 5 // 0.2, 0.4, 0.6, 0.8
            
            // Direct interpolation along cone surface
            const surfaceInterp = startSurface.clone().lerp(endSurface, t)
            
            // Ensure point is exactly on cone surface
            const projectedSurface = getClosestPointOnCone(surfaceInterp)
            
            // Apply minimal offset to avoid z-fighting with the cone surface
            const normal = getConeNormal(projectedSurface)
            const pathPoint = projectedSurface.clone().add(normal.multiplyScalar(0.001))
            
            orbitalPoints.push(pathPoint)
        }
        
    } else {
        // ORBITAL PATH: Create elevated path that follows cone contour
        console.log('🟡 Creating orbital cone path')
        
        const startOrbitalReduced = startSurface.clone().add(
            getConeNormal(startSurface).multiplyScalar(effectiveOrbitalDistance)
        )
        const endOrbitalReduced = endSurface.clone().add(
            getConeNormal(endSurface).multiplyScalar(effectiveOrbitalDistance)
        )
        
        // Transition from start surface to orbital distance
        const transitionPoint1 = start.clone().lerp(startOrbitalReduced, 0.5)
        const transitionPoint2 = start.clone().lerp(startOrbitalReduced, 1.0)
        orbitalPoints.push(transitionPoint1)
        orbitalPoints.push(transitionPoint2)
        
        // MIDDLE SECTION - follow the cone's surface contour at orbital distance
        for (let i = 1; i <= 3; i++) {
            const t = i / 4 // 0.25, 0.5, 0.75
            
            // Find surface point by interpolating between start and end surface points
            const surfaceInterp = startSurface.clone().lerp(endSurface, t)
            
            // Project this point onto the cone surface
            const projectedSurface = getClosestPointOnCone(surfaceInterp)
            
            // Create orbital point at specified distance from this surface point
            const normal = getConeNormal(projectedSurface)
            const orbitalPoint = projectedSurface.clone().add(normal.multiplyScalar(effectiveOrbitalDistance))
            
            orbitalPoints.push(orbitalPoint)
        }
        
        // Transition from orbital distance back to end surface
        const transitionPoint3 = endOrbitalReduced.clone().lerp(end, 0.5)
        orbitalPoints.push(transitionPoint3)
    }
    
    // End at actual grid point (surface)
    orbitalPoints.push(end.clone())
    
    console.log('🟡 Generated cone orbital path with', orbitalPoints.length, 'points')
    
    return orbitalPoints
}

/**
 * Get the center and average radius of the cone source object for fallback calculations
 * @param {Object} sourceObject - Source object with position and scale
 * @returns {Object} Object with center and radius properties
 */
export function getConeObjectProperties(sourceObject) {
    const center = new THREE.Vector3(...sourceObject.position)
    const scale = new THREE.Vector3(...sourceObject.scale)
    // For cone, use the base radius as the primary radius
    const averageRadius = Math.max(scale.x, scale.z)
    
    return { center, averageRadius, scale }
}
