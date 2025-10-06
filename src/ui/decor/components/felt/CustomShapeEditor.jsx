import React, { useState, useRef, useEffect } from 'react'
import { useDecorStore } from '../../../../app/stores/decorStore'

const CustomShapeEditor = () => {
  const { 
    showCustomShapeEditor, 
    closeCustomShapeEditor, 
    feltColor, 
    setFeltColor,
    setSelectedFeltShape,
    addCustomShape
  } = useDecorStore()
  
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [cutPaths, setCutPaths] = useState([])
  const [cutShape, setCutShape] = useState(null)

  // Canvas dimensions
  const CANVAS_WIDTH = 600
  const CANVAS_HEIGHT = 400

  useEffect(() => {
    if (showCustomShapeEditor && canvasRef.current) {
      drawCanvas()
    }
  }, [showCustomShapeEditor, feltColor, cutPaths, currentPath, cutShape])

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
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentPath([pos])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    
    const pos = getMousePos(e)
    setCurrentPath(prev => [...prev, pos])
  }

  const handleMouseUp = () => {
    if (isDrawing && currentPath.length > 1) {
      setCutPaths(prev => [...prev, currentPath])
      setCurrentPath([])
    }
    setIsDrawing(false)
  }

  const handleClearCuts = () => {
    setCutPaths([])
    setCurrentPath([])
    setCutShape(null)
  }

  const handleFinishCutting = () => {
    if (cutPaths.length === 0) return
    
    // Convert canvas coordinates to normalized 0-1 coordinates
    const feltLeft = 50
    const feltTop = 50
    const feltWidth = CANVAS_WIDTH - 100
    const feltHeight = CANVAS_HEIGHT - 100
    
    // Flatten all cut paths into a single outline
    const allPoints = cutPaths.flat()
    
    // Normalize coordinates
    const normalizedShape = allPoints.map(point => ({
      x: (point.x - feltLeft) / feltWidth,
      y: (point.y - feltTop) / feltHeight
    }))
    
    // Close the path if not already closed
    if (normalizedShape.length > 0) {
      const first = normalizedShape[0]
      const last = normalizedShape[normalizedShape.length - 1]
      const distance = Math.sqrt(
        Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2)
      )
      if (distance > 0.01) {
        normalizedShape.push({ ...first })
      }
    }
    
    setCutShape(normalizedShape)
  }

  const handleSaveShape = () => {
    if (!cutShape || cutShape.length < 3) return
    
    const customShape = {
      name: `Custom ${Date.now()}`,
      preview: '✂️',
      category: 'custom',
      path: cutShape
    }
    
    addCustomShape(customShape)
    alert('Custom shape saved to library!')
  }

  const handleUseShape = () => {
    if (!cutShape || cutShape.length < 3) return
    
    const customShapeData = {
      name: 'Custom',
      preview: '✂️',
      category: 'custom',
      path: cutShape
    }
    
    // Set this as the selected shape
    setSelectedFeltShape('custom', customShapeData)
    
    // Store in sessionStorage for placement component
    sessionStorage.setItem('pendingFeltShape', JSON.stringify(cutShape))
    sessionStorage.setItem('pendingFeltColor', feltColor)
    
    // Close the drawer
    closeCustomShapeEditor()
  }

  if (!showCustomShapeEditor) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '700px',
      backgroundColor: '#1a1a2a',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      transform: showCustomShapeEditor ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out'
    }}>
      {/* Header */}
      <div style={{
        padding: 20,
        backgroundColor: '#2a2a3a',
        borderBottom: '1px solid #3a3a4a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: 18 }}>✂️ Custom Felt Cutter</h2>
        <button 
          onClick={closeCustomShapeEditor}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            fontSize: 28, 
            cursor: 'pointer',
            padding: 0,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Color Picker */}
      <div style={{ padding: '16px 20px', backgroundColor: '#2a2a3a', borderBottom: '1px solid #3a3a4a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#aaa', fontSize: 14, minWidth: 80 }}>Felt Color:</label>
          <input 
            type="color" 
            value={feltColor} 
            onChange={(e) => setFeltColor(e.target.value)}
            style={{ width: 40, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer' }}
          />
          <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'monospace' }}>{feltColor}</span>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 20,
        overflow: 'auto'
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            border: '2px solid #3a3a4a',
            borderRadius: 8,
            cursor: 'crosshair',
            backgroundColor: '#0a0a1a'
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#2a2a3a',
        borderTop: '1px solid #3a3a4a',
        borderBottom: '1px solid #3a3a4a'
      }}>
        <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.6 }}>
          {!cutShape ? (
            <>
              <div>• Click and drag to draw cutting lines through the felt paper</div>
              <div>• Make multiple cuts to create your desired shape</div>
              <div>• Click "Finish Cutting" when done to preview your piece</div>
            </>
          ) : (
            <>
              <div>• Your custom felt piece is ready!</div>
              <div>• Click "Use Shape" to place it in the 3D scene</div>
              <div>• Or click "Save Shape" to add it to your library</div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        padding: 20, 
        backgroundColor: '#1a1a2a',
        display: 'flex', 
        gap: 12, 
        justifyContent: 'flex-end' 
      }}>
        {!cutShape ? (
          <>
            <button 
              onClick={handleFinishCutting}
              disabled={cutPaths.length === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: cutPaths.length > 0 ? '#4CAF50' : '#3a3a4a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: cutPaths.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Finish Cutting
            </button>
            <button 
              onClick={handleClearCuts}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Clear Cuts
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleSaveShape}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FF9800',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Save Shape
            </button>
            <button 
              onClick={handleUseShape}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Use Shape
            </button>
            <button 
              onClick={() => {
                setCutShape(null)
                setCutPaths([])
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default CustomShapeEditor

