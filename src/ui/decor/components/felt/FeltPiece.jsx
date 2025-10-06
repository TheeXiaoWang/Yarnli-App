import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useDecorStore } from '../../../../app/stores/decorStore'

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
// OPTIMIZED: This is called ONCE per felt piece, result is cached by useMemo
// IMPROVED: Averaged surface normal for consistent orientation on faceted surfaces
const morphGeometryToSurface = (geometry, centerPos, normal, sourceObject, scale = 1.0, debugId = '') => {
  if (!sourceObject || !sourceObject.mesh) {
    console.warn(`⚠️ [${debugId}] No sourceObject.mesh, returning flat geometry`)
    return geometry
  }

  const mesh = sourceObject.mesh
  const raycaster = new THREE.Raycaster()
  const positions = geometry.attributes.position.array
  const morphedGeometry = geometry.clone()
  const morphedPositions = morphedGeometry.attributes.position.array

  // Dynamic raycast distance based on felt scale
  const baseRaycastDistance = 2.0
  const raycastDistance = baseRaycastDistance + (scale * 2.0)
  const SURFACE_OFFSET = 0.02

  const normalVec = new THREE.Vector3(...normal).normalize()
  const centerPosVec = new THREE.Vector3(...centerPos)

  // STEP 1: Sample surface normals to calculate averaged orientation
  // This prevents tilting on faceted/low-poly surfaces
  const vertexCount = positions.length / 3
  const sampleIndices = []

  if (vertexCount > 8) {
    // Strategic sampling for shapes with many vertices
    sampleIndices.push(0,
      Math.floor(vertexCount * 0.25),
      Math.floor(vertexCount * 0.5),
      Math.floor(vertexCount * 0.75),
      vertexCount - 1
    )
    if (vertexCount > 50) {
      sampleIndices.push(
        Math.floor(vertexCount * 0.125),
        Math.floor(vertexCount * 0.375),
        Math.floor(vertexCount * 0.625),
        Math.floor(vertexCount * 0.875)
      )
    }
  } else {
    // Sample all vertices for small shapes
    for (let i = 0; i < vertexCount; i++) sampleIndices.push(i)
  }

  // Initial transform (will be refined with averaged normal)
  let quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normalVec
  )
  let feltToWorld = new THREE.Matrix4().compose(centerPosVec, quaternion, new THREE.Vector3(1, 1, 1))

  // Collect surface normals from sample points
  const surfaceNormals = []
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)

  for (const idx of sampleIndices) {
    const i = idx * 3
    const localPoint = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
    const worldPos = localPoint.clone().applyMatrix4(feltToWorld)

    // Bidirectional raycasting
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

  // Calculate averaged surface normal
  let averagedNormal = normalVec.clone()
  if (surfaceNormals.length > 0) {
    averagedNormal = new THREE.Vector3(0, 0, 0)
    for (const sn of surfaceNormals) averagedNormal.add(sn)
    averagedNormal.divideScalar(surfaceNormals.length).normalize()

    const deviation = normalVec.angleTo(averagedNormal) * (180 / Math.PI)
    if (deviation > 1.0) {
      console.log(`📐 [${debugId}] Averaged normal from ${surfaceNormals.length} samples (deviation: ${deviation.toFixed(1)}°)`)
    }
  }

  // STEP 2: Recalculate transform with averaged normal
  quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), averagedNormal)
  feltToWorld = new THREE.Matrix4().compose(centerPosVec, quaternion, new THREE.Vector3(1, 1, 1))

  let hitCount = 0
  let missCount = 0
  const missedVertices = []

  // STEP 3: Morph each vertex to surface using averaged normal
  for (let i = 0; i < positions.length; i += 3) {
    const localX = positions[i]
    const localY = positions[i + 1]
    const localZ = positions[i + 2]

    // Transform to world space using averaged orientation
    const worldPos = new THREE.Vector3(localX, localY, localZ).applyMatrix4(feltToWorld)

    let intersects = []

    // Try 1: Raycast from above (along averaged normal)
    const rayOriginAbove = worldPos.clone().add(averagedNormal.clone().multiplyScalar(raycastDistance))
    const rayDirectionDown = averagedNormal.clone().multiplyScalar(-1).normalize()
    raycaster.set(rayOriginAbove, rayDirectionDown)
    intersects = raycaster.intersectObject(mesh, true)

    // Try 2: If miss, raycast from below
    if (intersects.length === 0) {
      const rayOriginBelow = worldPos.clone().add(averagedNormal.clone().multiplyScalar(-raycastDistance))
      const rayDirectionUp = averagedNormal.clone().normalize()
      raycaster.set(rayOriginBelow, rayDirectionUp)
      intersects = raycaster.intersectObject(mesh, true)
    }

    // Try 3: Radial raycasting fallback
    if (intersects.length === 0) {
      const radialDirections = [
        averagedNormal.clone(),
        averagedNormal.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 6),
        averagedNormal.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 6),
        averagedNormal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6),
        averagedNormal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6)
      ]

      for (const dir of radialDirections) {
        const rayOrigin = worldPos.clone().add(dir.clone().multiplyScalar(raycastDistance))
        const rayDirection = dir.clone().multiplyScalar(-1).normalize()
        raycaster.set(rayOrigin, rayDirection)
        intersects = raycaster.intersectObject(mesh, true)
        if (intersects.length > 0) break
      }
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
      missedVertices.push(i / 3)
      // Keep original position for missed vertices
    }
  }

  const totalVertices = positions.length / 3
  const hitRate = ((hitCount / totalVertices) * 100).toFixed(1)

  console.log(`📊 [${debugId}] Raycast results:`, {
    totalVertices,
    hits: hitCount,
    misses: missCount,
    hitRate: `${hitRate}%`,
    raycastDistance: raycastDistance.toFixed(2),
    surfaceOffset: SURFACE_OFFSET
  })

  if (missCount > 0) {
    console.warn(`⚠️ [${debugId}] ${missCount} vertices failed to morph (${(100 - parseFloat(hitRate)).toFixed(1)}% miss rate)`)
    console.warn(`   Missed vertex indices:`, missedVertices.slice(0, 10), missedVertices.length > 10 ? '...' : '')
  }

  morphedGeometry.attributes.position.needsUpdate = true
  morphedGeometry.computeVertexNormals()
  return morphedGeometry
}

const FeltPiece = ({ id, shape, color, position, normal, scale = 1.0, rotation = 0, sourceObject = null, orbitalDistance = 0.05, selected = false, onSelect = null, onDelete = null }) => {

  // Get debug settings from store
  const { showFeltVertices } = useDecorStore()

  // Create geometry from the 2D shape - MUST MATCH FeltPlacement.jsx
  const geometry = useMemo(() => {
    // Check if shape has generateGeometry function (filled shapes like circle)
    if (shape && typeof shape.generateGeometry === 'function') {
      console.log(`🔵 [FeltPiece-${id}] Using filled geometry generator (scale: ${scale})`)
      // Pass scale to generateGeometry for adaptive vertex density
      const { vertices: rawVertices, indices: rawIndices } = shape.generateGeometry(scale)

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

      console.log(`✅ [FeltPiece-${id}] Filled geometry created:`, {
        vertices: vertices.length / 3,
        triangles: rawIndices.length / 3,
        scale: scale
      })

      return geometry
    }

    // Standard path-based shapes
    if (!shape || shape.length < 3) return null

    // PERFORMANCE OPTIMIZATION: Reduce subdivision from 3 to 1 for better performance
    let processedShape = shape

    // Only subdivide if the shape has fewer than 30 points (reduced threshold)
    if (shape.length < 30) {
      // Reduced from 3 to 1 intermediate point (2x instead of 4x vertices)
      processedShape = subdividePath(shape, 1)
      processedShape = smoothPath(processedShape, 0.2) // Reduced smoothing
    }

    // Convert 2D shape to 3D vertices
    const vertices = []
    const indices = []

    // Create vertices for the shape (flat on XY plane initially)
    // Center the shape around origin and apply scale - SAME AS PREVIEW
    const baseScale = 0.5 * scale
    processedShape.forEach((point, i) => {
      // Center around 0.5, 0.5 then offset to origin
      vertices.push((point.x - 0.5) * baseScale, (point.y - 0.5) * baseScale, 0)
    })

    // Simple triangulation for the shape (fan triangulation from first vertex)
    for (let i = 1; i < processedShape.length - 1; i++) {
      indices.push(0, i, i + 1)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()

    return geometry
  }, [shape, scale, id])

  // Apply surface morphing to make felt conform to curved surfaces
  // PERFORMANCE OPTIMIZATION: Morph ONCE when geometry/position changes, then cache
  // This avoids per-frame raycasting while maintaining surface conforming
  const morphedGeometry = useMemo(() => {
    if (!geometry || !position || !normal || !sourceObject) {
      console.log(`⚠️ [FeltPiece-${id}] Skipping morph - missing data:`, {
        hasGeometry: !!geometry,
        hasPosition: !!position,
        hasNormal: !!normal,
        hasSourceObject: !!sourceObject
      })
      return geometry
    }

    console.log(`🔧 [FeltPiece-${id}] Morphing geometry ONCE (will be cached)`)
    const startTime = performance.now()
    const morphed = morphGeometryToSurface(geometry, position, normal, sourceObject, scale, `FeltPiece-${id}`)
    const endTime = performance.now()
    console.log(`✅ [FeltPiece-${id}] Morphing completed in ${(endTime - startTime).toFixed(2)}ms`)

    return morphed
  }, [geometry, position, normal, sourceObject, scale, id])

  // Position and orient the felt piece
  const { finalPosition, finalRotation } = useMemo(() => {
    if (!position || !normal) {
      return {
        finalPosition: [0, 0, 0],
        finalRotation: [0, 0, 0]
      }
    }

    const pos = new THREE.Vector3(...position)
    const norm = new THREE.Vector3(...normal).normalize()

    // Offset the felt piece slightly from the surface
    const offsetDistance = orbitalDistance || 0.05
    const finalPos = pos.clone().add(norm.clone().multiplyScalar(offsetDistance))

    // Orient the felt piece to face outward from the surface
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    // Apply rotation around the Z-axis (surface normal)
    // Convert rotation from degrees to radians
    const rotationRadians = (rotation || 0) * (Math.PI / 180)

    return {
      finalPosition: [finalPos.x, finalPos.y, finalPos.z],
      finalRotation: [euler.x, euler.y, euler.z + rotationRadians]
    }
  }, [position, normal, orbitalDistance, rotation])

  // Handle click events
  const handleClick = (e) => {
    e.stopPropagation()
    if (e.shiftKey && onDelete) {
      onDelete(id)
    } else if (onSelect) {
      // Clear all other selections first, then select this felt
      const { clearAllSelections } = require('../../../../app/stores/decorStore').useDecorStore.getState()
      clearAllSelections()
      onSelect(id)
    }
  }

  if (!morphedGeometry) return null

  return (
    <group>
      <mesh
        position={finalPosition}
        rotation={finalRotation}
        geometry={morphedGeometry}
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
        {/* Use MeshBasicMaterial for better performance (no lighting calculations) */}
        {/* Morphed geometry is cached, so material can be simple */}
        <meshBasicMaterial
          color={selected ? new THREE.Color(color).multiplyScalar(1.3) : color}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.95}
        />
      </mesh>

      {/* Selection highlight - subtle outline */}
      {selected && (
        <mesh
          position={finalPosition}
          rotation={finalRotation}
          geometry={morphedGeometry}
          scale={[1.05, 1.05, 1.05]}
        >
          <meshBasicMaterial
            color={0x66ffcc}
            side={THREE.BackSide}
            transparent
            opacity={0.4}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Debug: Vertex markers */}
      {showFeltVertices && (
        <group position={finalPosition} rotation={finalRotation}>
          {/* Show morphed vertices (green) - vertices after surface conforming */}
          {morphedGeometry && (() => {
            const positions = morphedGeometry.attributes.position.array
            const markers = []

            for (let i = 0; i < positions.length; i += 3) {
              const localX = positions[i]
              const localY = positions[i + 1]
              const localZ = positions[i + 2]

              markers.push(
                <mesh
                  key={`morphed-${i}`}
                  position={[localX, localY, localZ]}
                >
                  <sphereGeometry args={[0.015, 8, 8]} />
                  <meshBasicMaterial
                    color={0x00ff00}
                    depthTest={false}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
              )
            }

            return markers
          })()}

          {/* Show original flat vertices (red) - vertices before morphing */}
          {geometry && (() => {
            const positions = geometry.attributes.position.array
            const markers = []

            for (let i = 0; i < positions.length; i += 3) {
              const localX = positions[i]
              const localY = positions[i + 1]
              const localZ = positions[i + 2]

              markers.push(
                <mesh
                  key={`original-${i}`}
                  position={[localX, localY, localZ]}
                >
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshBasicMaterial
                    color={0xff0000}
                    depthTest={false}
                    transparent
                    opacity={0.7}
                  />
                </mesh>
              )
            }

            return markers
          })()}
        </group>
      )}
    </group>
  )
}

export default FeltPiece
