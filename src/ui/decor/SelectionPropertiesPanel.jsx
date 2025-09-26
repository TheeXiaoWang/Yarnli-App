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
    updateYarnColor,
    updateEyeRadius,
    getItemName,
    clearAllSelections,
    setFeltColor
  } = useDecorStore()

  const selectedEye = selectedEyeId ? eyes.find(e => e.id === selectedEyeId) : null
  const selectedYarn = selectedYarnId ? yarns.find(y => y.id === selectedYarnId) : null
  const selectedFelt = selectedFeltId ? feltPieces.find(f => f.id === selectedFeltId) : null

  const selectedItem = selectedEye || selectedYarn || selectedFelt
  const selectedType = selectedEye ? 'eye' : selectedYarn ? 'yarn' : selectedFelt ? 'felt' : null

  if (!selectedItem) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 20,
        marginBottom: 12,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>⚙️</div>
        <div style={{ 
          color: '#a0a0b0',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 8
        }}>
          Select an item to edit properties
        </div>
        <div style={{ 
          color: '#666',
          fontSize: 12
        }}>
          Click on any item in the layers panel or the 3D scene
        </div>
      </div>
    )
  }

  const itemName = getItemName(selectedType, selectedItem.id)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(102,204,255,0.4)',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 2px 12px rgba(102,204,255,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16 
      }}>
        <div style={{ 
          color: '#66ccff', 
          fontSize: 16, 
          fontWeight: 600 
        }}>
          Properties
        </div>
        <button
          onClick={clearAllSelections}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: '#e5e5f0',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
        >
          Clear
        </button>
      </div>

      {/* Selected Item Info */}
      <div style={{ 
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 6,
        padding: 12,
        marginBottom: 16
      }}>
        <div style={{ 
          color: selectedType === 'eye' ? '#66ccff' : selectedType === 'yarn' ? '#ff66cc' : '#66ffcc',
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: selectedType === 'eye' ? '#66ccff' : selectedType === 'yarn' ? '#ff66cc' : '#66ffcc'
          }} />
          {itemName}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', textTransform: 'capitalize' }}>
          {selectedType} • ID: {selectedItem.id}
        </div>
      </div>

      {/* Eye Properties */}
      {selectedEye && (
        <div>
          <div style={{ 
            color: '#e5e5f0', 
            fontSize: 13, 
            fontWeight: 500, 
            marginBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: 8
          }}>
            Eye Properties
          </div>
          
          {/* Size Control */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 12, 
              color: '#ccc', 
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Size</span>
              <span style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10
              }}>
                {(selectedEye.radius || 0.12).toFixed(3)}
              </span>
            </div>
            <input 
              type="range" 
              min={0.4} 
              max={0.8} 
              step={0.01}
              value={selectedEye.radius || 0.12} 
              onChange={(e) => updateEyeRadius(selectedEye.id, Number(e.target.value))} 
              style={{ 
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Position Info */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#ccc', marginBottom: 4 }}>Position</div>
            <div style={{ 
              fontSize: 11, 
              color: '#aaa',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 8px',
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>
              [{selectedEye.position[0].toFixed(2)}, {selectedEye.position[1].toFixed(2)}, {selectedEye.position[2].toFixed(2)}]
            </div>
          </div>
        </div>
      )}

      {/* Yarn Properties */}
      {selectedYarn && (
        <div>
          <div style={{ 
            color: '#e5e5f0', 
            fontSize: 13, 
            fontWeight: 500, 
            marginBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: 8
          }}>
            Yarn Properties
          </div>

          {/* Color Control */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 12, 
              color: '#ccc', 
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Color</span>
              <span style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'monospace'
              }}>
                #{((selectedYarn?.color || 0xff66cc).toString(16).padStart(6, '0')).toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="color" 
                value={`#${(selectedYarn?.color || 0xff66cc).toString(16).padStart(6, '0')}`}
                onChange={(e) => updateYarnColor(selectedYarn.id, parseInt(e.target.value.slice(1), 16))} 
                style={{ 
                  width: 40, 
                  height: 30, 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: 6,
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: `#${(selectedYarn?.color || 0xff66cc).toString(16).padStart(6, '0')}`,
                border: '1px solid rgba(255,255,255,0.2)'
              }} />
            </div>
          </div>
          
          {/* Curvature Control */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 12, 
              color: '#ccc', 
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Curvature</span>
              <span style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10
              }}>
                {((selectedYarn?.curvature || 0.0) * 100).toFixed(0)}%
              </span>
            </div>
            <input 
              type="range" 
              min={-1.0} 
              max={1.0} 
              step={0.05}
              value={selectedYarn?.curvature || 0.0} 
              onChange={(e) => updateYarnCurvature(selectedYarn.id, Number(e.target.value))} 
              style={{ 
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ 
              fontSize: 10, 
              color: '#888', 
              marginTop: 4,
              textAlign: 'center'
            }}>
              -100% = bend left • 0% = straight • +100% = bend right
            </div>
          </div>

          {/* Radius Info */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#ccc', marginBottom: 4 }}>Radius</div>
            <div style={{ 
              fontSize: 11, 
              color: '#aaa',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 8px',
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>
              {selectedYarn.radius?.toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {/* Felt Properties */}
      {selectedFelt && (
        <div>
          <div style={{ 
            color: '#e5e5f0', 
            fontSize: 13, 
            fontWeight: 500, 
            marginBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: 8
          }}>
            Felt Properties
          </div>

          {/* Color Control */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 12, 
              color: '#ccc', 
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Color</span>
              <span style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10
              }}>
                {selectedFelt.color}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="color" 
                value={selectedFelt.color}
                onChange={(e) => setFeltColor(e.target.value)} 
                style={{ 
                  width: 40, 
                  height: 30, 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: 6,
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: selectedFelt.color,
                border: '1px solid rgba(255,255,255,0.2)'
              }} />
            </div>
          </div>

          {/* Position and Scale Info */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#ccc', marginBottom: 4 }}>Position</div>
            <div style={{ 
              fontSize: 11, 
              color: '#aaa',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 8px',
              borderRadius: 4,
              fontFamily: 'monospace',
              marginBottom: 8
            }}>
              [{selectedFelt.position.map(c => c.toFixed(2)).join(', ')}]
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#ccc', marginBottom: 4 }}>Scale</div>
            <div style={{ 
              fontSize: 11, 
              color: '#aaa',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 8px',
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>
              {selectedFelt.scale.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}