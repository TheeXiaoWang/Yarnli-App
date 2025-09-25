import React from 'react'
import { useDecorStore } from '../../app/stores/decorStore'

export default function SelectionPropertiesPanel() {
  const { 
    selectedEyeId, 
    selectedYarnId, 
    selectedFeltId, 
    eyes, 
    yarns, 
    feltPieces,
    updateYarnCurvature,
    getItemName,
    clearAllSelections
  } = useDecorStore()

  const selectedEye = selectedEyeId ? eyes.find(e => e.id === selectedEyeId) : null
  const selectedYarn = selectedYarnId ? yarns.find(y => y.id === selectedYarnId) : null
  const selectedFelt = selectedFeltId ? feltPieces.find(f => f.id === selectedFeltId) : null

  if (!selectedEye && !selectedYarn && !selectedFelt) {
    return null
  }

  return (
    <div style={{ 
      background: 'rgba(0,0,0,0.2)', 
      borderRadius: 8, 
      padding: 16,
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{ 
          color: '#a0a0ff', 
          fontWeight: 600,
          fontSize: 14
        }}>
          Properties
        </div>
        <button
          onClick={clearAllSelections}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ccc',
            fontSize: 10,
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>

      {selectedEye && (
        <div>
          <div style={{ 
            color: '#66ccff', 
            fontWeight: 500,
            marginBottom: 8,
            fontSize: 13
          }}>
            {getItemName('eye', selectedEye.id)}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Position: [{selectedEye.position[0].toFixed(2)}, {selectedEye.position[1].toFixed(2)}, {selectedEye.position[2].toFixed(2)}]
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Radius: {selectedEye.radius?.toFixed(3)}
          </div>
        </div>
      )}

      {selectedYarn && (
        <div>
          <div style={{ 
            color: '#ff66cc', 
            fontWeight: 500,
            marginBottom: 8,
            fontSize: 13
          }}>
            {getItemName('yarn', selectedYarn.id)}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4 }}>Curvature</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="range" 
                min={-1.0} 
                max={1.0} 
                step={0.05}
                value={selectedYarn?.curvature || 0.0} 
                onChange={(e) => updateYarnCurvature(selectedYarn.id, Number(e.target.value))} 
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 10, color: '#aaa', minWidth: 40 }}>
                {((selectedYarn?.curvature || 0.0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Radius: {selectedYarn.radius?.toFixed(3)}
          </div>
        </div>
      )}

      {selectedFelt && (
        <div>
          <div style={{ 
            color: '#66ffcc', 
            fontWeight: 500,
            marginBottom: 8,
            fontSize: 13
          }}>
            {getItemName('felt', selectedFelt.id)}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Color: {selectedFelt.color}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Scale: {selectedFelt.scale?.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            Position: [{selectedFelt.position[0].toFixed(2)}, {selectedFelt.position[1].toFixed(2)}, {selectedFelt.position[2].toFixed(2)}]
          </div>
        </div>
      )}
    </div>
  )
}
