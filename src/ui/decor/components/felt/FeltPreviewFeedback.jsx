import React, { useState, useEffect } from 'react'
import { useDecorStore } from '../../../../app/stores/decorStore'

const FeltPreviewFeedback = ({ tool }) => {
  const { selectedFeltShapeData, feltScale, feltSurfaceHover } = useDecorStore()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Only show when felt tool is active
  if (tool !== 'felt') return null
  
  const hasValidSurface = feltSurfaceHover && feltSurfaceHover.position
  // Accept both path-based shapes and filled shapes with generateGeometry
  const hasSelectedShape = selectedFeltShapeData && (selectedFeltShapeData.path || selectedFeltShapeData.generateGeometry)
  
  return (
    <div style={{
      position: 'fixed',
      left: mousePos.x + 20,
      top: mousePos.y + 20,
      pointerEvents: 'none',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      {/* Cursor indicator */}
      {hasSelectedShape && (
        <div style={{
          backgroundColor: hasValidSurface ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          {hasValidSurface ? (
            <>
              <span style={{ fontSize: 16 }}>✓</span>
              <span>Click to place</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>✗</span>
              <span>No valid surface</span>
            </>
          )}
        </div>
      )}
      
      {/* Shape info */}
      {hasSelectedShape && hasValidSurface && (
        <div style={{
          backgroundColor: 'rgba(42, 42, 58, 0.95)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>{selectedFeltShapeData.preview}</span>
            <span>{selectedFeltShapeData.name}</span>
          </div>
          <div style={{ color: '#aaa' }}>
            Size: {feltScale?.toFixed(1) || '1.0'}x
          </div>
        </div>
      )}
      
      {/* No shape selected warning */}
      {!hasSelectedShape && (
        <div style={{
          backgroundColor: 'rgba(255, 152, 0, 0.9)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>Select a felt shape first</span>
        </div>
      )}
      
      {/* Keyboard shortcuts hint */}
      {hasSelectedShape && (
        <div style={{
          backgroundColor: 'rgba(42, 42, 58, 0.8)',
          color: '#aaa',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          ESC to cancel
        </div>
      )}
    </div>
  )
}

export default FeltPreviewFeedback

