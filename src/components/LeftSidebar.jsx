import React, { useState } from 'react'
import { useSceneStore } from '../stores/sceneStore'
import { useTransformMode } from '../contexts/TransformContext'

const LeftSidebar = () => {
  const { addObject, selectedObject, updateObjectScale, updateObjectPosition, updateObjectRotation } = useSceneStore()
  const { transformMode } = useTransformMode()
  
  const [scaleValues, setScaleValues] = useState({ x: 1, y: 1, z: 1 })
  const [positionValues, setPositionValues] = useState({ x: 0, y: 0, z: 0 })
  const [rotationValues, setRotationValues] = useState({ x: 0, y: 0, z: 0 })

  // Update local state when selected object changes
  React.useEffect(() => {
    if (selectedObject) {
      setScaleValues({
        x: selectedObject.scale[0],
        y: selectedObject.scale[1],
        z: selectedObject.scale[2]
      })
      setPositionValues({
        x: Number(selectedObject.position[0].toFixed(1)),
        y: Number(selectedObject.position[1].toFixed(1)),
        z: Number(selectedObject.position[2].toFixed(1))
      })
      setRotationValues({
        x: selectedObject.rotation[0],
        y: selectedObject.rotation[1],
        z: selectedObject.rotation[2]
      })
    }
  }, [selectedObject])

  const handleAddObject = (type) => {
    const position = [0, 1, 0]
    addObject(type, position)
  }

  const handleDragStart = (e, type) => {
    e.dataTransfer.effectAllowed = 'copy'
    try { e.dataTransfer.setData('text/primitive', type) } catch (_) {}
  }

  const handleScaleChange = (axis, value) => {
    const newScale = { ...scaleValues, [axis]: parseFloat(value) || 0 }
    setScaleValues(newScale)
    
    if (selectedObject) {
      updateObjectScale(selectedObject.id, [newScale.x, newScale.y, newScale.z])
    }
  }

  const handlePositionChange = (axis, value) => {
    const snapped = Math.round((parseFloat(value) || 0) * 10) / 10
    const newPosition = { ...positionValues, [axis]: snapped }
    setPositionValues(newPosition)
    
    if (selectedObject) {
      updateObjectPosition(selectedObject.id, [newPosition.x, newPosition.y, newPosition.z])
    }
  }

  const handleRotationChange = (axis, value) => {
    const newRotation = { ...rotationValues, [axis]: parseFloat(value) || 0 }
    setRotationValues(newRotation)
    
    if (selectedObject) {
      updateObjectRotation(selectedObject.id, [newRotation.x, newRotation.y, newRotation.z])
    }
  }

  return (
    <div className="left-sidebar">
      {/* Primitive Tools */}
      <div className="sidebar-section">
        <h3>Primitives</h3>
        <div className="tool-grid">
          <button 
            className="tool-btn"
            onClick={() => handleAddObject('sphere')}
            draggable
            onDragStart={(e) => handleDragStart(e, 'sphere')}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Sphere
          </button>
          <button 
            className="tool-btn"
            onClick={() => handleAddObject('cone')}
            draggable
            onDragStart={(e) => handleDragStart(e, 'cone')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 2L4 20h16L12 2z" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Cone
          </button>
          <button className="tool-btn" draggable onDragStart={(e) => handleDragStart(e, 'cube')}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Cube
          </button>
          <button className="tool-btn" draggable onDragStart={(e) => handleDragStart(e, 'cylinder')}>
            <svg viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Cylinder
          </button>
        </div>
      </div>

      {/* Transform Controls */}
      {selectedObject && (
        <div className="sidebar-section">
          <h3>Transform</h3>
          <div className="transform-controls">
            <h4>Position</h4>
            <div className="transform-inputs">
              <div className="input-group">
                <label>X</label>
                <input
                  type="number"
                  step="0.1"
                  value={positionValues.x}
                  onChange={(e) => handlePositionChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={positionValues.y}
                  onChange={(e) => handlePositionChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={positionValues.z}
                  onChange={(e) => handlePositionChange('z', e.target.value)}
                />
              </div>
            </div>

            <h4>Rotation (deg)</h4>
            <div className="transform-inputs">
              <div className="input-group">
                <label>X</label>
                <input
                  type="number"
                  step="1"
                  value={rotationValues.x}
                  onChange={(e) => handleRotationChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="1"
                  value={rotationValues.y}
                  onChange={(e) => handleRotationChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="1"
                  value={rotationValues.z}
                  onChange={(e) => handleRotationChange('z', e.target.value)}
                />
              </div>
            </div>

            <h4>Scale</h4>
            <div className="transform-inputs">
              <div className="input-group">
                <label>X</label>
                <input
                  type="number"
                  step="0.1"
                  value={scaleValues.x}
                  onChange={(e) => handleScaleChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={scaleValues.y}
                  onChange={(e) => handleScaleChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={scaleValues.z}
                  onChange={(e) => handleScaleChange('z', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layerline Tools */}
      <div className="sidebar-section">
        <h3>Layerlines</h3>
        <div className="tool-grid">
          <button className="tool-btn">
            <svg viewBox="0 0 24 24">
              <path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Generate
          </button>
          <button className="tool-btn">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 1v6m0 6v6" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
