import * as THREE from 'three'

/**
 * Calculate orbital path around an ellipsoid source object
 * @param {THREE.Vector3} start - Start point on ellipsoid surface
 * @param {THREE.Vector3} end - End point on ellipsoid surface  
 * @param {Object} sourceObject - Source object with position, scale, rotation
 * @param {number} orbitalDistance - Distance to orbit from ellipsoid surface
 * @returns {THREE.Vector3[]} Array of points forming the orbital curve
 */
export function calculateEllipsoidOrbitalPath(start, end, sourceObject, orbitalDistance = 0.15, curvature = 0.0) {
    // Get ellipsoid properties from source object
    const ellipsoidCenter = new THREE.Vector3(...sourceObject.position)
    const ellipsoidScale = new THREE.Vector3(...sourceObject.scale)
    const ellipsoidRotation = new THREE.Euler(
        sourceObject.rotation[0] * (Math.PI / 180),
        sourceObject.rotation[1] * (Math.PI / 180),
        sourceObject.rotation[2] * (Math.PI / 180)
    )
    
    console.log('🟡 Ellipsoid orbital calculation:', {
        center: ellipsoidCenter,
        scale: ellipsoidScale,
        rotation: ellipsoidRotation,
        orbitalDistance
    })
    
    // Create transformation matrix for the ellipsoid
    const ellipsoidMatrix = new THREE.Matrix4()
    ellipsoidMatrix.compose(ellipsoidCenter, new THREE.Quaternion().setFromEuler(ellipsoidRotation), ellipsoidScale)
    
    // Create inverse matrix to transform points to ellipsoid local space
    const inverseMatrix = ellipsoidMatrix.clone().invert()
    
    /**
     * Get the closest point on ellipsoid surface to a given point
     * @param {THREE.Vector3} point - Point in world space
     * @returns {THREE.Vector3} Closest point on ellipsoid surface in world space
     */
    const getClosestPointOnEllipsoid = (point) => {
        // Transform point to ellipsoid local space (unit sphere)
        const localPoint = point.clone().applyMatrix4(inverseMatrix)
        
        // Normalize to get point on unit sphere
        const normalizedPoint = localPoint.normalize()
        
        // Transform back to world space (ellipsoid surface)
        return normalizedPoint.applyMatrix4(ellipsoidMatrix)
    }
    
    /**
     * Get the surface normal at a point on the ellipsoid
     * @param {THREE.Vector3} surfacePoint - Point on ellipsoid surface in world space
     * @returns {THREE.Vector3} Outward normal vector in world space
     */
    const getEllipsoidNormal = (surfacePoint) => {
        // Transform to local space
        const localPoint = surfacePoint.clone().applyMatrix4(inverseMatrix)
        
        // For a unit sphere, the normal is just the normalized position
        const localNormal = localPoint.normalize()
        
        // Transform normal back to world space (but don't include translation)
        const worldNormal = localNormal.clone()
        worldNormal.transformDirection(ellipsoidMatrix)
        
        return worldNormal.normalize()
    }
    
    /**
     * Get orbital point at specified distance from ellipsoid surface
     * @param {THREE.Vector3} surfacePoint - Point on ellipsoid surface
     * @returns {THREE.Vector3} Point at orbital distance from surface
     */
    const getOrbitalPoint = (surfacePoint) => {
        const normal = getEllipsoidNormal(surfacePoint)
        return surfacePoint.clone().add(normal.multiplyScalar(orbitalDistance))
    }
    
    // Ensure start and end points are on ellipsoid surface
    const startSurface = getClosestPointOnEllipsoid(start)
    const endSurface = getClosestPointOnEllipsoid(end)
    
    console.log('🟡 Surface points:', {
        originalStart: start,
        startSurface: startSurface,
        originalEnd: end,
        endSurface: endSurface
    })
    
    // Get orbital points for start and end
    const startOrbital = getOrbitalPoint(startSurface)
    const endOrbital = getOrbitalPoint(endSurface)
    
    console.log('🟡 Orbital points:', {
        startOrbital: startOrbital,
        endOrbital: endOrbital
    })
    
    // Create orbital path that connects grid points but maintains orbital distance in the middle
    const numIntermediatePoints = 11
    const orbitalPoints = []
    
    // Start at actual grid point (surface)
    orbitalPoints.push(start.clone())
    
    // Create the direct line between start and end ORBITAL points for middle section guidance
    const orbitalDirectLine = new THREE.Line3(startOrbital, endOrbital)
    
    // Create smooth transition from surface to orbital distance
    const numTransitionPoints = 2
    
    // Transition from start surface to orbital distance
    for (let i = 1; i <= numTransitionPoints; i++) {
        const t = i / (numTransitionPoints + 1)
        const transitionPoint = start.clone().lerp(startOrbital, t)
        orbitalPoints.push(transitionPoint)
    }
    
    // Create intermediate orbital points that maintain consistent orbital distance
    const numMiddlePoints = numIntermediatePoints - 2 * numTransitionPoints - 2
    for (let i = 1; i <= numMiddlePoints; i++) {
        const t = i / (numMiddlePoints + 1)
        
        // Get point along the direct orbital line
        let directOrbitalPoint = orbitalDirectLine.at(t, new THREE.Vector3())
        
        // Apply curvature if specified
        if (Math.abs(curvature) > 0.001) {
            // Calculate perpendicular direction for curvature
            const orbitalDirection = endOrbital.clone().sub(startOrbital).normalize()
            const upVector = new THREE.Vector3(0, 1, 0)
            let perpendicular = new THREE.Vector3().crossVectors(orbitalDirection, upVector)
            
            // If orbital direction is too close to up vector, use a different reference
            if (perpendicular.lengthSq() < 0.01) {
                perpendicular = new THREE.Vector3().crossVectors(orbitalDirection, new THREE.Vector3(1, 0, 0))
            }
            perpendicular.normalize()
            
            // Apply sine wave curvature (max bend at middle)
            const curvatureIntensity = Math.sin(t * Math.PI) * curvature * orbitalDistance * 2
            const curvatureOffset = perpendicular.clone().multiplyScalar(curvatureIntensity)
            directOrbitalPoint.add(curvatureOffset)
            
            console.log('🟡 Applied curvature:', {
                t: t,
                curvature: curvature,
                curvatureIntensity: curvatureIntensity,
                perpendicular: perpendicular
            })
        }
        
        // Find the closest point on ellipsoid surface to this orbital point
        const closestSurface = getClosestPointOnEllipsoid(directOrbitalPoint)
        
        // Calculate the actual orbital point at exact orbital distance from this surface point
        const correctedOrbitalPoint = getOrbitalPoint(closestSurface)
        
        // For straighter paths, blend between direct orbital line and corrected orbital point
        const distance = start.distanceTo(end)
        const straightnessWeight = Math.min(distance / 4.0, 0.6)
        
        let finalPoint = directOrbitalPoint.clone().lerp(correctedOrbitalPoint, 1 - straightnessWeight)
        
        // CRITICAL: Ensure the final point is exactly at orbital distance from ellipsoid surface
        const finalClosestSurface = getClosestPointOnEllipsoid(finalPoint)
        const currentDistance = finalPoint.distanceTo(finalClosestSurface)
        
        // If the distance is not correct, project it to the correct orbital distance
        if (Math.abs(currentDistance - orbitalDistance) > 0.01) {
            const surfaceNormal = getEllipsoidNormal(finalClosestSurface)
            finalPoint = finalClosestSurface.clone().add(surfaceNormal.multiplyScalar(orbitalDistance))
        }
        
        orbitalPoints.push(finalPoint)
    }
    
    // Transition from orbital distance back to end surface
    for (let i = 1; i <= numTransitionPoints; i++) {
        const t = i / (numTransitionPoints + 1)
        const transitionPoint = endOrbital.clone().lerp(end, t)
        orbitalPoints.push(transitionPoint)
    }
    
    // End at actual grid point (surface)
    orbitalPoints.push(end.clone())
    
    console.log('🟡 Generated orbital path with', orbitalPoints.length, 'points')
    
    return orbitalPoints
}

/**
 * Get the center and average radius of the source object for fallback calculations
 * @param {Object} sourceObject - Source object with position and scale
 * @returns {Object} Object with center and radius properties
 */
export function getSourceObjectProperties(sourceObject) {
    const center = new THREE.Vector3(...sourceObject.position)
    const scale = new THREE.Vector3(...sourceObject.scale)
    const averageRadius = (scale.x + scale.y + scale.z) / 3
    
    return { center, averageRadius, scale }
}
