import React, { useState, useEffect } from 'react'
import FeltShapeLibrary, { PRESET_SHAPES } from './FeltShapeLibrary'
import { useDecorStore } from '../../../../app/stores/decorStore'

const FeltPanel = () => {
  const {
    feltColor,
    setFeltColor,
    feltScale,
    setFeltScale,
    feltRotation,
    setFeltRotation,
    selectedFeltShape,
    setSelectedFeltShape,
    openCustomShapeEditor
  } = useDecorStore()

  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-select first shape (heart) if none selected
  useEffect(() => {
    if (!selectedFeltShape) {
      const firstShape = Object.entries(PRESET_SHAPES)[0]
      if (firstShape) {
        setSelectedFeltShape(firstShape[0], firstShape[1])
      }
    }
  }, [selectedFeltShape, setSelectedFeltShape])
  
  const handleSelectShape = (shapeKey, shapeData) => {
    setSelectedFeltShape(shapeKey, shapeData)
  }
  
  return (
    <div style={{
      backgroundColor: '#1a1a2a',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: 12,
          backgroundColor: '#2a2a3a',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 600
        }}
      >
        <span>✂️ Felt Shapes</span>
        <span style={{ 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div style={{ padding: 12 }}>
          {/* Shape Library */}
          <div style={{ marginBottom: 16 }}>
            <FeltShapeLibrary
              selectedShape={selectedFeltShape}
              onSelectShape={handleSelectShape}
              onOpenCustomEditor={openCustomShapeEditor}
            />
          </div>
          
          {/* Color Picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: 'block',
              color: '#aaa',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 500
            }}>
              Color
            </label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10,
              backgroundColor: '#2a2a3a',
              padding: 8,
              borderRadius: 6
            }}>
              <input 
                type="color" 
                value={feltColor} 
                onChange={(e) => setFeltColor(e.target.value)}
                style={{ 
                  width: 40, 
                  height: 32, 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={feltColor}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setFeltColor(val)
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#1a1a2a',
                  border: '1px solid #3a3a4a',
                  borderRadius: 4,
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
          
          {/* Size Slider */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#aaa',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 500
            }}>
              Size: {feltScale?.toFixed(1) || '1.0'}x
            </label>
            <div style={{
              backgroundColor: '#2a2a3a',
              padding: 8,
              borderRadius: 6
            }}>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={feltScale || 1.0}
                onChange={(e) => setFeltScale(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#666',
                marginTop: 4
              }}>
                <span>0.1x</span>
                <span>1.0x</span>
                <span>5.0x</span>
                <span>10.0x</span>
              </div>
            </div>
          </div>

          {/* Rotation Slider */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#aaa',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: 500
            }}>
              Rotation: {feltRotation?.toFixed(0) || '0'}°
            </label>
            <div style={{
              backgroundColor: '#2a2a3a',
              padding: 8,
              borderRadius: 6
            }}>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={feltRotation || 0}
                onChange={(e) => setFeltRotation(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#666',
                marginTop: 4
              }}>
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
                <span>270°</span>
                <span>360°</span>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div style={{
            backgroundColor: '#2a2a3a',
            padding: 10,
            borderRadius: 6,
            fontSize: 11,
            color: '#aaa',
            lineHeight: 1.5
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#6a6aff' }}>ℹ️</span> Hover over surface to preview
            </div>
            <div>
              <span style={{ color: '#6a6aff' }}>🖱️</span> Click to place
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeltPanel

