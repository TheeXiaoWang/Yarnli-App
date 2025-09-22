import React, { useState, useRef, useEffect } from 'react'
import { useDecorStore } from '../../../../app/stores/decorStore'

const FeltModal = () => {
  const { showFeltModal, closeFeltModal, feltColor, setFeltColor, addFeltPiece } = useDecorStore()
  
  // Debug modal state
  React.useEffect(() => {
    console.log('🟦 FeltModal showFeltModal state:', showFeltModal)
  }, [showFeltModal])
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [cutPaths, setCutPaths] = useState([])
  const [mode, setMode] = useState('cut') // 'cut' | 'place'
  const [cutShape, setCutShape] = useState(null)

  // Canvas dimensions
  const CANVAS_WIDTH = 600
  const CANVAS_HEIGHT = 400

  useEffect(() => {
    if (showFeltModal && canvasRef.current) {
      drawCanvas()
    }
  }, [showFeltModal, feltColor, cutPaths, currentPath])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Draw felt paper background
    ctx.fillStyle = feltColor
    ctx.fillRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100)
    
    // Draw border
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100)
    
    // Draw cut paths
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Draw completed cut paths
    cutPaths.forEach(path => {
      if (path.length > 1) {
        ctx.beginPath()
        ctx.moveTo(path[0].x, path[0].y)
        path.forEach(point => ctx.lineTo(point.x, point.y))
        ctx.stroke()
      }
    })
    
    // Draw current path
    if (currentPath.length > 1) {
      ctx.beginPath()
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      currentPath.forEach(point => ctx.lineTo(point.x, point.y))
      ctx.stroke()
    }
    
    // If we have a cut shape, highlight it
    if (cutShape && cutShape.length > 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.moveTo(cutShape[0].x, cutShape[0].y)
      cutShape.forEach(point => ctx.lineTo(point.x, point.y))
      ctx.closePath()
      ctx.fill()
      
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseDown = (e) => {
    if (mode !== 'cut') return
    
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentPath([pos])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || mode !== 'cut') return
    
    const pos = getMousePos(e)
    setCurrentPath(prev => [...prev, pos])
  }

  const handleMouseUp = () => {
    if (!isDrawing || mode !== 'cut') return
    
    setIsDrawing(false)
    if (currentPath.length > 2) {
      setCutPaths(prev => [...prev, currentPath])
    }
    setCurrentPath([])
  }

  const handleFinishCutting = () => {
    if (cutPaths.length === 0) return
    
    // Combine all cut paths into one shape
    const allPoints = cutPaths.flat()
    if (allPoints.length < 3) return
    
    // Convert canvas coordinates to normalized coordinates (-1 to 1)
    const normalizedShape = allPoints.map(point => ({
      x: ((point.x - 50) / (CANVAS_WIDTH - 100)) * 2 - 1,
      y: ((point.y - 50) / (CANVAS_HEIGHT - 100)) * 2 - 1
    }))
    
    setCutShape(normalizedShape)
    setMode('place')
  }

  const handleClearCuts = () => {
    setCutPaths([])
    setCurrentPath([])
    setCutShape(null)
    setMode('cut')
  }

  const handleDone = () => {
    if (cutShape) {
      // Store the cut shape for placement in 3D scene
      console.log('🟢 Felt piece ready for placement:', {
        shape: cutShape,
        color: feltColor
      })
      
      // Store in sessionStorage for the placement component to pick up
      sessionStorage.setItem('pendingFeltShape', JSON.stringify(cutShape))
      sessionStorage.setItem('pendingFeltColor', feltColor)
      console.log('🟢 Stored felt shape in sessionStorage')
    }
    console.log('🟢 Closing felt modal - tool should remain "felt"')
    closeFeltModal()
  }

  if (!showFeltModal) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 20,
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#fff' }}>Felt Paper Cutter</h2>
          <button 
            onClick={closeFeltModal}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#fff', 
              fontSize: 24, 
              cursor: 'pointer' 
            }}
          >
            ×
          </button>
        </div>

        {/* Color Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#fff', fontSize: 14 }}>Felt Color:</label>
          <input 
            type="color" 
            value={feltColor} 
            onChange={(e) => setFeltColor(e.target.value)}
            style={{ width: 40, height: 30, border: 'none', borderRadius: 4 }}
          />
          <span style={{ color: '#ccc', fontSize: 12 }}>{feltColor}</span>
        </div>

        {/* Mode Indicator */}
        <div style={{ color: '#fff', fontSize: 14 }}>
          {mode === 'cut' ? (
            <span>✂️ Draw cutting lines to cut out your felt piece</span>
          ) : (
            <span>✅ Felt piece ready! Click "Done" to place it in the scene</span>
          )}
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            border: '2px solid #555',
            borderRadius: 4,
            cursor: mode === 'cut' ? 'crosshair' : 'default',
            backgroundColor: '#1a1a1a'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {mode === 'cut' ? (
            <>
              <button 
                onClick={handleFinishCutting}
                disabled={cutPaths.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: cutPaths.length > 0 ? '#4CAF50' : '#555',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: cutPaths.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Finish Cutting
              </button>
              <button 
                onClick={handleClearCuts}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Clear Cuts
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleDone}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Done - Place in Scene
              </button>
              <button 
                onClick={() => setMode('cut')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Back to Cutting
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', maxWidth: 500 }}>
          {mode === 'cut' ? (
            <>
              <div>• Click and drag to cut lines through the felt paper</div>
              <div>• Make multiple cuts to create your desired shape</div>
              <div>• Click "Finish Cutting" when done to preview your piece</div>
            </>
          ) : (
            <>
              <div>• Your cut felt piece is ready for placement</div>
              <div>• Click "Done" to close this modal and place it in the 3D scene</div>
              <div>• The piece will follow your mouse and warp to the object's curvature</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FeltModal
