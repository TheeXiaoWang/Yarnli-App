import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useDecorStore } from '../../../../app/stores/decorStore'
import { useFrame } from '@react-three/fiber'

// Helper function to subdivide a path for smoother geometry
const subdividePath = (path, subdivisions = 2) => {
  if (!path || path.length < 2) return path

  const result = []

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i]
    const p2 = path[i + 1]

    result.push(p1)

    // Add intermediate points
    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1)
      result.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
      })
    }
  }

  // Add the last point
  result.push(path[path.length - 1])

  return result
}

// Helper function to smooth a path using Catmull-Rom interpolation
const smoothPath = (path, smoothness = 0.5) => {
  if (!path || path.length < 3) return path

  const result = []

  for (let i = 0; i < path.length; i++) {
    const p0 = path[Math.max(0, i - 1)]
    const p1 = path[i]
    const p2 = path[Math.min(path.length - 1, i + 1)]
    const p3 = path[Math.min(path.length - 1, i + 2)]

    // Simple smoothing: average with neighbors
    result.push({
      x: p1.x * (1 - smoothness) + (p0.x + p2.x) * smoothness * 0.5,
      y: p1.y * (1 - smoothness) + (p0.y + p2.y) * smoothness * 0.5
    })
  }

  return result
}

// Helper function to morph flat geometry to follow surface curvature
// OPTIMIZED: Throttled to avoid lag during mouse movement
// IMPROVED: Averaged surface normal for consistent orientation
// RETURNS: { geometry, averagedNormal } - both the morphed geometry and the averaged normal
const morphGeometryToSurface = (geometry, centerPos, normal, sourceObject, scale = 1.0, debugId = '') => {
  if (!sourceObject || !sourceObject.mesh) {
    console.warn(`⚠️ [${debugId}] No sourceObject.mesh, returning flat geometry`)
    return { geometry, averagedNormal: new THREE.Vector3(...normal).normalize() }
  }

  const mesh = sourceObject.mesh
  const raycaster = new THREE.Raycaster()
  const positions = geometry.attributes.position.array
  const morphedGeometry = geometry.clone()
  const morphedPositions = morphedGeometry.attributes.position.array

  const baseRaycastDistance = 2.0
  const raycastDistance = baseRaycastDistance + (scale * 2.0)
  const SURFACE_OFFSET = 0.02

  const normalVec = new THREE.Vector3(...normal).normalize()
  const centerPosVec = new THREE.Vector3(...centerPos)

  // Sample surface normals for averaged orientation
  const vertexCount = positions.length / 3
  const sampleIndices = []

  if (vertexCount > 8) {
    sampleIndices.push(0,
      Math.floor(vertexCount * 0.25),
      Math.floor(vertexCount * 0.5),
      Math.floor(vertexCount * 0.75),
      vertexCount - 1
    )
  } else {
    for (let i = 0; i < vertexCount; i++) sampleIndices.push(i)
  }

  let quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec)
  let feltToWorld = new THREE.Matrix4().compose(centerPosVec, quaternion, new THREE.Vector3(1, 1, 1))

  const surfaceNormals = []
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)

  for (const idx of sampleIndices) {
    const i = idx * 3
    const localPoint = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
    const worldPos = localPoint.clone().applyMatrix4(feltToWorld)

    const rayOriginAbove = worldPos.clone().add(normalVec.clone().multiplyScalar(raycastDistance))
    raycaster.set(rayOriginAbove, normalVec.clone().multiplyScalar(-1).normalize())
    let intersects = raycaster.intersectObject(mesh, true)

    if (intersects.length === 0) {
      const rayOriginBelow = worldPos.clone().add(normalVec.clone().multiplyScalar(-raycastDistance))
      raycaster.set(rayOriginBelow, normalVec.clone().normalize())
      intersects = raycaster.intersectObject(mesh, true)
    }

    if (intersects.length > 0) {
      const surfaceNormal = intersects[0].face.normal.clone()
      surfaceNormal.applyMatrix3(normalMatrix).normalize()
      surfaceNormals.push(surfaceNormal)
    }
  }

  let averagedNormal = normalVec.clone()
  if (surfaceNormals.length > 0) {
    averagedNormal = new THREE.Vector3(0, 0, 0)
    for (const sn of surfaceNormals) averagedNormal.add(sn)
    averagedNormal.divideScalar(surfaceNormals.length).normalize()
  }

  quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), averagedNormal)
  feltToWorld = new THREE.Matrix4().compose(centerPosVec, quaternion, new THREE.Vector3(1, 1, 1))

  let hitCount = 0
  let missCount = 0

  // Morph each vertex using averaged normal
  for (let i = 0; i < positions.length; i += 3) {
    const localX = positions[i]
    const localY = positions[i + 1]
    const localZ = positions[i + 2]

    const worldPos = new THREE.Vector3(localX, localY, localZ).applyMatrix4(feltToWorld)

    let intersects = []

    // Raycast from above using averaged normal
    const rayOriginAbove = worldPos.clone().add(averagedNormal.clone().multiplyScalar(raycastDistance))
    const rayDirectionDown = averagedNormal.clone().multiplyScalar(-1).normalize()
    raycaster.set(rayOriginAbove, rayDirectionDown)
    intersects = raycaster.intersectObject(mesh, true)

    // Try from below if missed
    if (intersects.length === 0) {
      const rayOriginBelow = worldPos.clone().add(averagedNormal.clone().multiplyScalar(-raycastDistance))
      const rayDirectionUp = averagedNormal.clone().normalize()
      raycaster.set(rayOriginBelow, rayDirectionUp)
      intersects = raycaster.intersectObject(mesh, true)
    }

    if (intersects.length > 0) {
      hitCount++
      // Use the closest intersection point
      const surfacePoint = intersects[0].point
      const surfaceNormal = intersects[0].face.normal.clone()

      // Transform surface normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
      surfaceNormal.applyMatrix3(normalMatrix).normalize()

      // Apply CONSTANT offset distance along LOCAL surface normal
      const finalPoint = surfacePoint.clone().add(surfaceNormal.multiplyScalar(SURFACE_OFFSET))

      // Convert back to local felt space
      const feltToWorldInverse = feltToWorld.clone().invert()
      const localPoint = finalPoint.applyMatrix4(feltToWorldInverse)

      morphedPositions[i] = localPoint.x
      morphedPositions[i + 1] = localPoint.y
      morphedPositions[i + 2] = localPoint.z
    } else {
      missCount++
    }
  }

  const totalVertices = positions.length / 3
  const hitRate = ((hitCount / totalVertices) * 100).toFixed(1)

  console.log(`📊 [${debugId}] Raycast results:`, {
    totalVertices,
    hits: hitCount,
    misses: missCount,
    hitRate: `${hitRate}%`,
    raycastDistance: raycastDistance.toFixed(2)
  })

  if (missCount > 0) {
    console.warn(`⚠️ [${debugId}] ${missCount} vertices failed to morph`)
  }

  morphedGeometry.attributes.position.needsUpdate = true
  morphedGeometry.computeVertexNormals()

  // Return both the morphed geometry and the averaged normal
  return { geometry: morphedGeometry, averagedNormal }
}

const FeltPlacement = ({ hoverPreview, sourceObject, orbitalDistance }) => {

  // Get the selected felt shape and settings from store (not sessionStorage)
  const { selectedFeltShapeData, feltColor, feltScale, feltRotation } = useDecorStore()

  // Pulsing animation state
  const [pulsePhase, setPulsePhase] = React.useState(0)

  // Animate pulse
  useFrame((state) => {
    setPulsePhase(state.clock.elapsedTime * 2)
  })

  // Helper function to create geometry from path or filled shape - MUST be defined before use
  const createGeometryFromPath = React.useCallback((pathOrShape, scale) => {
    // Check if this is a filled shape with generateGeometry function
    if (pathOrShape && typeof pathOrShape.generateGeometry === 'function') {
      console.log(`🔵 [FeltPlacement] Using filled geometry generator (scale: ${scale})`)
      // Pass scale to generateGeometry for adaptive vertex density
      const { vertices: rawVertices, indices: rawIndices } = pathOrShape.generateGeometry(scale)

      // Apply scale and centering
      const baseScale = 0.5 * scale
      const vertices = []
      for (let i = 0; i < rawVertices.length; i += 3) {
        vertices.push(
          (rawVertices[i] - 0.5) * baseScale,
          (rawVertices[i + 1] - 0.5) * baseScale,
          rawVertices[i + 2]
        )
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setIndex(rawIndices)
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.computeVertexNormals()

      console.log('✅ [FeltPlacement] Filled geometry created:', {
        vertices: vertices.length / 3,
        triangles: rawIndices.length / 3,
        scale: scale
      })

      return geometry
    }

    // Standard path-based shapes
    const path = pathOrShape

    // PERFORMANCE OPTIMIZATION: Reduce subdivision from 3 to 1 for better performance
    let processedPath = path

    // Only subdivide if the shape has fewer than 30 points (reduced threshold)
    if (path.length < 30) {
      // Reduced from 3 to 1 intermediate point (2x instead of 4x vertices)
      processedPath = subdividePath(path, 1)
      processedPath = smoothPath(processedPath, 0.2) // Reduced smoothing
    }

    const vertices = []
    const indices = []

    // Create vertices for the shape (flat on XY plane initially)
    // Center the shape around origin and apply scale
    const baseScale = 0.5 * scale
    processedPath.forEach((point) => {
      // Center around 0.5, 0.5 then offset to origin
      vertices.push((point.x - 0.5) * baseScale, (point.y - 0.5) * baseScale, 0)
    })

    // Simple triangulation for the shape (fan triangulation from first vertex)
    for (let i = 1; i < processedPath.length - 1; i++) {
      indices.push(0, i, i + 1)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()

    return geometry
  }, [])

  // Create geometry from the selected shape
  const geometry = useMemo(() => {
    // Check if this is a filled shape (has generateGeometry function)
    if (selectedFeltShapeData?.filled && selectedFeltShapeData?.generateGeometry) {
      console.log('🔵 [FeltPlacement] Creating filled shape geometry')
      return createGeometryFromPath(selectedFeltShapeData, feltScale || 1.0)
    }

    // Standard path-based shape
    const shapePath = selectedFeltShapeData?.path

    if (!shapePath || shapePath.length < 3) {
      // Fallback: create a simple circle if shape parsing fails
      const circlePoints = []
      const segments = 32
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        circlePoints.push({
          x: 0.5 + Math.cos(angle) * 0.4,
          y: 0.5 + Math.sin(angle) * 0.4
        })
      }
      return createGeometryFromPath(circlePoints, feltScale || 1.0)
    }

    return createGeometryFromPath(shapePath, feltScale || 1.0)
  }, [selectedFeltShapeData, feltScale, createGeometryFromPath])

  // Apply surface morphing to preview
  // PERFORMANCE OPTIMIZATION: Use throttled position to avoid morphing on every mouse pixel
  const [throttledHoverPreview, setThrottledHoverPreview] = React.useState(null)

  // Throttle hover preview updates to reduce morphing frequency
  React.useEffect(() => {
    if (!hoverPreview) {
      setThrottledHoverPreview(null)
      return
    }

    // Only update if position changed significantly (> 0.1 units)
    if (!throttledHoverPreview ||
        Math.abs(hoverPreview.position[0] - throttledHoverPreview.position[0]) > 0.1 ||
        Math.abs(hoverPreview.position[1] - throttledHoverPreview.position[1]) > 0.1 ||
        Math.abs(hoverPreview.position[2] - throttledHoverPreview.position[2]) > 0.1) {
      setThrottledHoverPreview(hoverPreview)
    }
  }, [hoverPreview, throttledHoverPreview])

  // Store both morphed geometry and averaged normal
  const { morphedGeometry, averagedNormal } = useMemo(() => {
    if (!geometry || !throttledHoverPreview || !throttledHoverPreview.position || !throttledHoverPreview.normal || !sourceObject) {
      return {
        morphedGeometry: geometry,
        averagedNormal: new THREE.Vector3(...(throttledHoverPreview?.normal || [0, 0, 1])).normalize()
      }
    }

    console.log('🔧 [FeltPlacement] Morphing preview geometry (throttled)')
    const startTime = performance.now()
    const { geometry: morphed, averagedNormal: avgNormal } = morphGeometryToSurface(
      geometry,
      throttledHoverPreview.position,
      throttledHoverPreview.normal,
      sourceObject,
      feltScale,
      'FeltPlacement'
    )
    const endTime = performance.now()
    console.log(`✅ [FeltPlacement] Morphing completed in ${(endTime - startTime).toFixed(2)}ms`)

    return { morphedGeometry: morphed, averagedNormal: avgNormal }
  }, [geometry, throttledHoverPreview, sourceObject, feltScale])

  // Position and orient the preview felt piece using AVERAGED NORMAL
  const { finalPosition, finalRotation } = useMemo(() => {
    if (!hoverPreview || !hoverPreview.position || !hoverPreview.normal || !averagedNormal) {
      return {
        finalPosition: [0, 0, 0],
        finalRotation: [0, 0, 0]
      }
    }

    const pos = new THREE.Vector3(...hoverPreview.position)
    // USE AVERAGED NORMAL instead of single-point normal for consistent orientation
    const norm = averagedNormal.clone().normalize()

    // Offset the felt piece from the surface
    const offsetDistance = orbitalDistance || 0.05
    const finalPos = pos.clone().add(norm.clone().multiplyScalar(offsetDistance))

    // Orient the felt piece using averaged normal (matches final placement)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    // Apply rotation around the Z-axis (surface normal)
    const rotationRadians = (feltRotation || 0) * (Math.PI / 180)

    return {
      finalPosition: [finalPos.x, finalPos.y, finalPos.z],
      finalRotation: [euler.x, euler.y, euler.z + rotationRadians]
    }
  }, [hoverPreview, orbitalDistance, feltRotation, averagedNormal])

  // Calculate pulsing opacity
  const pulseOpacity = 0.5 + 0.2 * Math.sin(pulsePhase)

  if (!selectedFeltShapeData || !morphedGeometry || !hoverPreview) return null

  return (
    <group>
      {/* Main preview mesh with pulsing opacity */}
      <mesh
        position={finalPosition}
        rotation={finalRotation}
        geometry={morphedGeometry}
      >
        {/* Use MeshBasicMaterial for better performance */}
        {/* Morphing is throttled, so this won't cause lag */}
        <meshBasicMaterial
          color={feltColor}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={pulseOpacity}
        />
      </mesh>

      {/* Subtle outline glow effect */}
      <mesh
        position={finalPosition}
        rotation={finalRotation}
        geometry={morphedGeometry}
        scale={[1.05, 1.05, 1.05]}
      >
        <meshBasicMaterial
          color={0xffffff}
          side={THREE.BackSide}
          transparent
          opacity={0.2}
          depthTest={false}
        />
      </mesh>
    </group>
  )
}

export default FeltPlacement
