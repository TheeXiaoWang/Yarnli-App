import React, { useState } from 'react'
import { useSceneStore } from '../../stores/sceneStore'
import { useTransformMode } from '../../contexts/TransformContext'

const LeftSidebar = () => {
  const { addObject, selectedObject, updateObjectScale, updateObjectPosition, updateObjectRotation } = useSceneStore()
  const { transformMode } = useTransformMode()
  
  const [scaleValues, setScaleValues] = useState({ x: 1, y: 1, z: 1 })
  const [positionValues, setPositionValues] = useState({ x: 0, y: 0, z: 0 })
  const [rotationValues, setRotationValues] = useState({ x: 0, y: 0, z: 0 })
  const [focusedField, setFocusedField] = useState(null)

  // Numeric helpers: snap to step and remove floating artifacts (e.g., 5.300000000000001 → 5.3)
  const sanitizeNumber = (value, step = 0.1, decimals = 6) => {
    const num = Math.abs(parseFloat(value) || 0)
    const snapped = step > 0 ? Math.round(num / step) * step : num
    let s = snapped.toFixed(decimals)
    s = s.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'')
    return Number(s)
  }

  // Update local state when selected object changes
  React.useEffect(() => {
    if (selectedObject) {
      setScaleValues({
        x: sanitizeNumber(selectedObject.scale[0], 0.1, 6),
        y: sanitizeNumber(selectedObject.scale[1], 0.1, 6),
        z: sanitizeNumber(selectedObject.scale[2], 0.1, 6)
      })
      const fmt = (n) => sanitizeNumber(n, 0.1, 6)
      setPositionValues({
        x: fmt(selectedObject.position[0]),
        y: fmt(selectedObject.position[1]),
        z: fmt(selectedObject.position[2])
      })
      setRotationValues({
        x: sanitizeNumber(selectedObject.rotation[0], 1, 3),
        y: sanitizeNumber(selectedObject.rotation[1], 1, 3),
        z: sanitizeNumber(selectedObject.rotation[2], 1, 3)
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
    const newScale = { ...scaleValues, [axis]: sanitizeNumber(value, 0.1, 6) }
    setScaleValues(newScale)
    
    if (selectedObject) {
      updateObjectScale(selectedObject.id, [newScale.x, newScale.y, newScale.z])
    }
  }

  const handlePositionChange = (axis, value) => {
    const clean = sanitizeNumber(value, 0.1, 6)
    const newPosition = { ...positionValues, [axis]: clean }
    setPositionValues(newPosition)
    
    if (selectedObject) {
      updateObjectPosition(selectedObject.id, [newPosition.x, newPosition.y, newPosition.z])
    }
  }

  const handleRotationChange = (axis, value) => {
    const newRotation = { ...rotationValues, [axis]: sanitizeNumber(value, 1, 3) }
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
                  min="0"
                  value={focusedField==='posX' ? positionValues.x : Number(positionValues.x)}
                  onFocus={() => setFocusedField('posX')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handlePositionChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={focusedField==='posY' ? positionValues.y : Number(positionValues.y)}
                  onFocus={() => setFocusedField('posY')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handlePositionChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={focusedField==='posZ' ? positionValues.z : Number(positionValues.z)}
                  onFocus={() => setFocusedField('posZ')}
                  onBlur={() => setFocusedField(null)}
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
                  min="0"
                  value={focusedField==='rotX' ? rotationValues.x : Number(rotationValues.x)}
                  onFocus={() => setFocusedField('rotX')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handleRotationChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={focusedField==='rotY' ? rotationValues.y : Number(rotationValues.y)}
                  onFocus={() => setFocusedField('rotY')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handleRotationChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={focusedField==='rotZ' ? rotationValues.z : Number(rotationValues.z)}
                  onFocus={() => setFocusedField('rotZ')}
                  onBlur={() => setFocusedField(null)}
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
                  min="0"
                  value={focusedField==='sclX' ? scaleValues.x : Number(scaleValues.x)}
                  onFocus={() => setFocusedField('sclX')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handleScaleChange('x', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={focusedField==='sclY' ? scaleValues.y : Number(scaleValues.y)}
                  onFocus={() => setFocusedField('sclY')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => handleScaleChange('y', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Z</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={focusedField==='sclZ' ? scaleValues.z : Number(scaleValues.z)}
                  onFocus={() => setFocusedField('sclZ')}
                  onBlur={() => setFocusedField(null)}
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
