import React from 'react'

// Preset felt shapes with normalized 0-1 coordinates
// Each shape is defined as an array of {x, y} points that form a closed path
export const PRESET_SHAPES = {
  heart: {
    name: 'Heart',
    preview: '❤️',
    category: 'basic',
    // FILLED HEART: Radial distribution from center
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      // Heart parametric equation
      const heartX = (t) => {
        const angle = t * Math.PI * 2
        return 0.5 + 0.16 * Math.pow(Math.sin(angle), 3)
      }
      const heartY = (t) => {
        const angle = t * Math.PI * 2
        return 0.5 - 0.13 * (Math.cos(angle) - 0.5 * Math.cos(2 * angle) - 0.2 * Math.cos(3 * angle) - 0.05 * Math.cos(4 * angle))
      }

      // Center vertex
      vertices.push(0.5, 0.5, 0)

      // Concentric rings
      const rings = [
        { radiusScale: 0.3, segments: 8 },
        { radiusScale: 0.6, segments: 16 },
        { radiusScale: 1.0, segments: 24 }
      ]

      rings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.segments; i++) {
          const t = i / ring.segments
          const centerX = 0.5
          const centerY = 0.5
          const targetX = heartX(t)
          const targetY = heartY(t)

          const x = centerX + (targetX - centerX) * ring.radiusScale
          const y = centerY + (targetY - centerY) * ring.radiusScale
          vertices.push(x, y, 0)
        }

        // Triangulate
        if (ringIndex === 0) {
          const ringStart = 1
          for (let i = 0; i < ring.segments; i++) {
            const next = (i + 1) % ring.segments
            indices.push(0, ringStart + i, ringStart + next)
          }
        } else {
          const prevRing = rings[ringIndex - 1]
          const prevRingStart = 1 + rings.slice(0, ringIndex - 1).reduce((sum, r) => sum + r.segments, 0)
          const currRingStart = 1 + rings.slice(0, ringIndex).reduce((sum, r) => sum + r.segments, 0)

          for (let i = 0; i < ring.segments; i++) {
            const currNext = (i + 1) % ring.segments
            const prevIdx = Math.floor((i / ring.segments) * prevRing.segments)
            const prevNext = Math.floor((currNext / ring.segments) * prevRing.segments)

            indices.push(currRingStart + i, prevRingStart + prevIdx, currRingStart + currNext)
            if (prevIdx !== prevNext) {
              indices.push(currRingStart + currNext, prevRingStart + prevIdx, prevRingStart + prevNext)
            }
          }
        }
      })

      return { vertices, indices }
    }
  },
  
  star: {
    name: 'Star',
    preview: '⭐',
    category: 'basic',
    // FILLED STAR: Radial segments from center
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      // Center vertex
      vertices.push(0.5, 0.5, 0)

      // 5-pointed star with concentric rings
      const points = 5
      const rings = [
        { radiusOuter: 0.15, radiusInner: 0.06 },
        { radiusOuter: 0.30, radiusInner: 0.12 },
        { radiusOuter: 0.45, radiusInner: 0.18 }
      ]

      rings.forEach((ring, ringIndex) => {
        // Add vertices for outer points and inner valleys
        for (let i = 0; i < points * 2; i++) {
          const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
          const isOuter = i % 2 === 0
          const radius = isOuter ? ring.radiusOuter : ring.radiusInner

          const x = 0.5 + Math.cos(angle) * radius
          const y = 0.5 + Math.sin(angle) * radius
          vertices.push(x, y, 0)
        }

        // Triangulate
        const segmentCount = points * 2
        if (ringIndex === 0) {
          const ringStart = 1
          for (let i = 0; i < segmentCount; i++) {
            const next = (i + 1) % segmentCount
            indices.push(0, ringStart + i, ringStart + next)
          }
        } else {
          const prevRingStart = 1 + (ringIndex - 1) * segmentCount
          const currRingStart = 1 + ringIndex * segmentCount

          for (let i = 0; i < segmentCount; i++) {
            const next = (i + 1) % segmentCount
            indices.push(currRingStart + i, prevRingStart + i, currRingStart + next)
            indices.push(currRingStart + next, prevRingStart + i, prevRingStart + next)
          }
        }
      })

      return { vertices, indices }
    }
  },
  
  circle: {
    name: 'Circle',
    preview: '⚫',
    category: 'basic',
    // FILLED CIRCLE: vertices distributed throughout the area, not just perimeter
    // ADAPTIVE: vertex density adjusts based on scale for optimal performance
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const centerX = 0.5
      const centerY = 0.5
      const maxRadius = 0.45

      const vertices = []
      const indices = []

      // Center vertex
      vertices.push(centerX, centerY, 0)

      // Adaptive vertex density based on scale
      let rings
      if (scale < 1.0) {
        // Small circles: ~29 vertices (1 + 6 + 10 + 12)
        rings = [
          { radius: 0.15, segments: 6 },
          { radius: 0.30, segments: 10 },
          { radius: 0.45, segments: 12 }
        ]
      } else if (scale < 3.0) {
        // Medium circles: ~49 vertices (1 + 8 + 16 + 24)
        rings = [
          { radius: 0.15, segments: 8 },
          { radius: 0.30, segments: 16 },
          { radius: 0.45, segments: 24 }
        ]
      } else if (scale < 6.0) {
        // Large circles: ~73 vertices (1 + 12 + 24 + 36)
        rings = [
          { radius: 0.15, segments: 12 },
          { radius: 0.30, segments: 24 },
          { radius: 0.45, segments: 36 }
        ]
      } else {
        // Extra large circles: ~97 vertices (1 + 16 + 32 + 48)
        rings = [
          { radius: 0.15, segments: 16 },
          { radius: 0.30, segments: 32 },
          { radius: 0.45, segments: 48 }
        ]
      }

      // Generate vertices for each ring
      rings.forEach((ring, ringIndex) => {
        const { radius, segments } = ring
        const normalizedRadius = radius / maxRadius * 0.45

        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2
          const x = centerX + Math.cos(angle) * normalizedRadius
          const y = centerY + Math.sin(angle) * normalizedRadius
          vertices.push(x, y, 0)
        }

        // Triangulate: connect this ring to previous ring (or center)
        if (ringIndex === 0) {
          // Connect center to first ring
          const ringStart = 1
          const ringSegments = ring.segments

          for (let i = 0; i < ringSegments; i++) {
            const next = (i + 1) % ringSegments
            indices.push(
              0,                    // Center
              ringStart + i,        // Current vertex on ring
              ringStart + next      // Next vertex on ring
            )
          }
        } else {
          // Connect this ring to previous ring
          const prevRing = rings[ringIndex - 1]
          const prevRingStart = 1 + rings.slice(0, ringIndex - 1).reduce((sum, r) => sum + r.segments, 0)
          const currRingStart = 1 + rings.slice(0, ringIndex).reduce((sum, r) => sum + r.segments, 0)

          const prevSegments = prevRing.segments
          const currSegments = ring.segments

          // Create quad strips between rings
          for (let i = 0; i < currSegments; i++) {
            const currNext = (i + 1) % currSegments
            const prevIdx = Math.floor((i / currSegments) * prevSegments)
            const prevNext = Math.floor((currNext / currSegments) * prevSegments)

            // Triangle 1
            indices.push(
              currRingStart + i,
              prevRingStart + prevIdx,
              currRingStart + currNext
            )

            // Triangle 2 (if needed for proper connection)
            if (prevIdx !== prevNext) {
              indices.push(
                currRingStart + currNext,
                prevRingStart + prevIdx,
                prevRingStart + prevNext
              )
            }
          }
        }
      })

      return { vertices, indices }
    }
  },
  
  square: {
    name: 'Square',
    preview: '⬛',
    category: 'basic',
    // FILLED SQUARE: 7x7 Cartesian grid (49 vertices)
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      const min = 0.1
      const max = 0.9
      const gridSize = 7  // 7x7 = 49 vertices

      // Generate grid vertices
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const x = min + (col / (gridSize - 1)) * (max - min)
          const y = min + (row / (gridSize - 1)) * (max - min)
          vertices.push(x, y, 0)
        }
      }

      // Generate triangles (two triangles per grid cell)
      for (let row = 0; row < gridSize - 1; row++) {
        for (let col = 0; col < gridSize - 1; col++) {
          const topLeft = row * gridSize + col
          const topRight = topLeft + 1
          const bottomLeft = (row + 1) * gridSize + col
          const bottomRight = bottomLeft + 1

          // Triangle 1 (top-left, bottom-left, top-right)
          indices.push(topLeft, bottomLeft, topRight)

          // Triangle 2 (top-right, bottom-left, bottom-right)
          indices.push(topRight, bottomLeft, bottomRight)
        }
      }

      return { vertices, indices }
    }
  },
  
  triangle: {
    name: 'Triangle',
    preview: '▲',
    category: 'basic',
    // FILLED TRIANGLE: Concentric triangular layers
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      // Triangle corners
      const top = { x: 0.5, y: 0.1 }
      const bottomRight = { x: 0.9, y: 0.9 }
      const bottomLeft = { x: 0.1, y: 0.9 }

      // Create concentric triangular layers
      const layers = 7  // 7 layers from center to edge

      for (let layer = 0; layer < layers; layer++) {
        const t = layer / (layers - 1)  // 0 to 1 from center to edge

        // Interpolate triangle vertices for this layer
        const layerTop = {
          x: 0.5 + t * (top.x - 0.5),
          y: 0.5 + t * (top.y - 0.5)
        }
        const layerBR = {
          x: 0.5 + t * (bottomRight.x - 0.5),
          y: 0.5 + t * (bottomRight.y - 0.5)
        }
        const layerBL = {
          x: 0.5 + t * (bottomLeft.x - 0.5),
          y: 0.5 + t * (bottomLeft.y - 0.5)
        }

        // Number of vertices per side for this layer
        const verticesPerSide = Math.max(1, layer + 1)

        // Add vertices along each edge of this triangular layer
        // Edge 1: Top to Bottom Right
        for (let i = 0; i < verticesPerSide; i++) {
          const s = i / Math.max(1, verticesPerSide - 1)
          vertices.push(
            layerTop.x + s * (layerBR.x - layerTop.x),
            layerTop.y + s * (layerBR.y - layerTop.y),
            0
          )
        }

        // Edge 2: Bottom Right to Bottom Left (skip first vertex to avoid duplicate)
        for (let i = 1; i < verticesPerSide; i++) {
          const s = i / Math.max(1, verticesPerSide - 1)
          vertices.push(
            layerBR.x + s * (layerBL.x - layerBR.x),
            layerBR.y + s * (layerBL.y - layerBR.y),
            0
          )
        }

        // Edge 3: Bottom Left to Top (skip first and last to avoid duplicates)
        for (let i = 1; i < verticesPerSide - 1; i++) {
          const s = i / Math.max(1, verticesPerSide - 1)
          vertices.push(
            layerBL.x + s * (layerTop.x - layerBL.x),
            layerBL.y + s * (layerTop.y - layerBL.y),
            0
          )
        }
      }

      // Simple fan triangulation from center
      const vertexCount = vertices.length / 3
      for (let i = 1; i < vertexCount - 1; i++) {
        indices.push(0, i, i + 1)
      }

      return { vertices, indices }
    }
  },
  
  flower: {
    name: 'Flower',
    preview: '🌸',
    category: 'decorative',
    // FILLED FLOWER: Radial petals with concentric rings
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      // Center vertex
      vertices.push(0.5, 0.5, 0)

      const petals = 6
      const centerRadius = 0.15
      const petalRadius = 0.35

      // Concentric rings
      const rings = [
        { radiusScale: 0.3 },
        { radiusScale: 0.6 },
        { radiusScale: 1.0 }
      ]

      const segmentsPerRing = petals * 8

      rings.forEach((ring, ringIndex) => {
        for (let i = 0; i < segmentsPerRing; i++) {
          const angle = (i / segmentsPerRing) * Math.PI * 2
          const petalAngle = angle * petals
          const radius = (centerRadius + petalRadius * (0.5 + 0.5 * Math.cos(petalAngle))) * ring.radiusScale

          const x = 0.5 + Math.cos(angle) * radius
          const y = 0.5 + Math.sin(angle) * radius
          vertices.push(x, y, 0)
        }

        // Triangulate
        if (ringIndex === 0) {
          const ringStart = 1
          for (let i = 0; i < segmentsPerRing; i++) {
            const next = (i + 1) % segmentsPerRing
            indices.push(0, ringStart + i, ringStart + next)
          }
        } else {
          const prevRingStart = 1 + (ringIndex - 1) * segmentsPerRing
          const currRingStart = 1 + ringIndex * segmentsPerRing

          for (let i = 0; i < segmentsPerRing; i++) {
            const next = (i + 1) % segmentsPerRing
            indices.push(currRingStart + i, prevRingStart + i, currRingStart + next)
            indices.push(currRingStart + next, prevRingStart + i, prevRingStart + next)
          }
        }
      })

      return { vertices, indices }
    }
  },
  
  butterfly: {
    name: 'Butterfly',
    preview: '🦋',
    category: 'decorative',
    // FILLED BUTTERFLY: Symmetric wings with interior vertices
    filled: true,
    generateGeometry: (scale = 1.0) => {
      const vertices = []
      const indices = []

      // Center body vertices (vertical line)
      const bodySegments = 5
      for (let i = 0; i < bodySegments; i++) {
        const y = 0.2 + (i / (bodySegments - 1)) * 0.6
        vertices.push(0.5, y, 0)
      }

      // Left wings (upper and lower)
      const wingSegments = 8
      for (let i = 0; i < wingSegments; i++) {
        const t = i / (wingSegments - 1)

        // Left upper wing
        const upperX = 0.5 - 0.15 - t * 0.2
        const upperY = 0.3 - t * 0.1
        vertices.push(upperX, upperY, 0)

        // Left lower wing
        const lowerX = 0.5 - 0.15 - t * 0.2
        const lowerY = 0.7 + t * 0.1
        vertices.push(lowerX, lowerY, 0)
      }

      // Right wings (mirror of left)
      for (let i = 0; i < wingSegments; i++) {
        const t = i / (wingSegments - 1)

        // Right upper wing
        const upperX = 0.5 + 0.15 + t * 0.2
        const upperY = 0.3 - t * 0.1
        vertices.push(upperX, upperY, 0)

        // Right lower wing
        const lowerX = 0.5 + 0.15 + t * 0.2
        const lowerY = 0.7 + t * 0.1
        vertices.push(lowerX, lowerY, 0)
      }

      // Simple fan triangulation from first body vertex
      const vertexCount = vertices.length / 3
      for (let i = 1; i < vertexCount - 1; i++) {
        indices.push(0, i, i + 1)
      }

      return { vertices, indices }
    }
  },

  custom: {
    name: 'Custom',
    preview: '✂️',
    category: 'custom',
    path: null // Custom shapes are created by the user
  }
}

// FeltShapeLibrary Component
const FeltShapeLibrary = ({ selectedShape, onSelectShape, onOpenCustomEditor }) => {
  const shapes = Object.entries(PRESET_SHAPES)
  
  const handleShapeClick = (shapeKey, shapeData) => {
    if (shapeKey === 'custom') {
      onOpenCustomEditor?.()
    } else {
      onSelectShape?.(shapeKey, shapeData)
    }
  }
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      padding: '8px 0'
    }}>
      {shapes.map(([key, shape]) => (
        <button
          key={key}
          onClick={() => handleShapeClick(key, shape)}
          style={{
            padding: 8,
            backgroundColor: selectedShape === key ? '#4a4a6a' : '#2a2a3a',
            border: selectedShape === key ? '2px solid #6a6aff' : '1px solid #3a3a4a',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.2s',
            color: '#fff'
          }}
          onMouseEnter={(e) => {
            if (selectedShape !== key) {
              e.currentTarget.style.backgroundColor = '#3a3a4a'
              e.currentTarget.style.borderColor = '#5a5a6a'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedShape !== key) {
              e.currentTarget.style.backgroundColor = '#2a2a3a'
              e.currentTarget.style.borderColor = '#3a3a4a'
            }
          }}
        >
          <div style={{ fontSize: 24 }}>{shape.preview}</div>
          <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center' }}>
            {shape.name}
          </div>
        </button>
      ))}
    </div>
  )
}

export default FeltShapeLibrary

