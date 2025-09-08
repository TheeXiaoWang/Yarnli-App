import React from 'react'
import { useSceneStore } from '../../stores/sceneStore'
import LayerlinePanel from './LayerlinePanel'

const RightSidebar = () => {
  const { objects, selectedObject, toggleObjectVisibility, toggleAllVisibility, setPriorityOverride } = useSceneStore()

  const getObjectInfo = () => {
    if (!selectedObject) return null

    return {
      id: selectedObject.id,
      type: selectedObject.type,
      position: selectedObject.position.map(p => p.toFixed(2)),
      scale: selectedObject.scale.map(s => s.toFixed(2)),
      rotation: selectedObject.rotation.map(r => r.toFixed(1)),
      visible: selectedObject.visible ? 'Yes' : 'No'
    }
  }

  const objectInfo = getObjectInfo()

  return (
    <div className="right-sidebar">
      {/* Scene Information */}
      <div className="properties-section">
        <h3>Scene</h3>
        <div className="property-item">
          <span className="property-label">Total Objects</span>
          <span className="property-value">{objects.length}</span>
        </div>
        <div className="property-item">
          <span className="property-label">Visible Objects</span>
          <span className="property-value">{objects.filter(obj => obj.visible).length}</span>
        </div>
        <div className="property-item" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="property-label">Visibility</span>
          <button className="btn" onClick={toggleAllVisibility}>
            {objects.some(o => o.visible) ? 'Hide All' : 'Show All'}
          </button>
        </div>
        <div className="property-item">
          <span className="property-label">Spheres</span>
          <span className="property-value">{objects.filter(obj => obj.type === 'sphere').length}</span>
        </div>
        <div className="property-item">
          <span className="property-label">Cones</span>
          <span className="property-value">{objects.filter(obj => obj.type === 'cone').length}</span>
        </div>
      </div>

      {/* Selected Object Properties */}
      {objectInfo && (
        <div className="properties-section">
          <h3>Selected Object</h3>
          <div className="property-item">
            <span className="property-label">ID</span>
            <span className="property-value">{objectInfo.id}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Type</span>
            <span className="property-value">{objectInfo.type}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Position</span>
            <span className="property-value">({objectInfo.position.join(', ')})</span>
          </div>
          <div className="property-item">
            <span className="property-label">Scale</span>
            <span className="property-value">({objectInfo.scale.join(', ')})</span>
          </div>
          <div className="property-item">
            <span className="property-label">Rotation</span>
            <span className="property-value">({objectInfo.rotation.join(', ')}°)</span>
          </div>
          <div className="property-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="property-label">Visible</span>
            <button className="btn" onClick={() => toggleObjectVisibility(selectedObject.id)}>
              {selectedObject.visible ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="property-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="property-label">Priority</span>
            <div style={{ display:'inline-flex', gap:6 }}>
              <button className={`btn ${selectedObject.priorityOverride==='auto'?'btn-primary':''}`} onClick={() => setPriorityOverride(selectedObject.id,'auto')}>Auto</button>
              <button className={`btn ${selectedObject.priorityOverride==='strong'?'btn-primary':''}`} onClick={() => setPriorityOverride(selectedObject.id,'strong')}>Strong</button>
              <button className={`btn ${selectedObject.priorityOverride==='weak'?'btn-primary':''}`} onClick={() => setPriorityOverride(selectedObject.id,'weak')}>Weak</button>
            </div>
          </div>
        </div>
      )}

      {/* Layerline Panel */}
      <LayerlinePanel />

      {/* Camera Information */}
      <div className="properties-section">
        <h3>Camera</h3>
        <div className="property-item">
          <span className="property-label">Position</span>
          <span className="property-value">(10.0, 10.0, 10.0)</span>
        </div>
        <div className="property-item">
          <span className="property-label">FOV</span>
          <span className="property-value">75°</span>
        </div>
        <div className="property-item">
          <span className="property-label">Mode</span>
          <span className="property-value">Perspective</span>
        </div>
      </div>

      {/* Performance */}
      <div className="properties-section">
        <h3>Performance</h3>
        <div className="property-item">
          <span className="property-label">FPS</span>
          <span className="property-value">60</span>
        </div>
        <div className="property-item">
          <span className="property-label">Draw Calls</span>
          <span className="property-value">{objects.length + 3}</span>
        </div>
        <div className="property-item">
          <span className="property-label">Triangles</span>
          <span className="property-value">{objects.length * 1000}</span>
        </div>
      </div>
    </div>
  )
}

export default RightSidebar
