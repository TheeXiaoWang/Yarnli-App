import React from 'react'
import { useDecorStore } from '../../app/stores/decorStore'

// Modern SVG icons
const EyeIcon = ({ visible }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible ? (
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
    {visible && <circle cx="12" cy="12" r="3" />}
  </svg>
)

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
)

const TypeIcon = ({ type }) => {
  if (type === 'eye') return <div style={{ width:16, height:16, borderRadius:'50%', background:'#66ccff', border:'2px solid #4a90e2' }} />
  if (type === 'yarn') return <div style={{ width:16, height:3, borderRadius:2, background:'#ff66cc' }} />
  if (type === 'felt') return <div style={{ width:16, height:16, borderRadius:3, background:'#66ffcc', border:'1px solid #4dc9a0' }} />
  return null
}

const LayerRow = ({ name, id, type, hidden, onToggle, onRename, onDelete, onSelect, isSelected }) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(name)
  const [showMenu, setShowMenu] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const inputRef = React.useRef(null)
  const menuRef = React.useRef(null)

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditValue(name)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleSubmit = () => {
    setIsEditing(false)
    onRename(editValue || name)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(name)
    }
  }

  const handleMenuRename = () => {
    setShowMenu(false)
    setIsEditing(true)
    setEditValue(name)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleMenuDelete = () => {
    setShowMenu(false)
    onDelete()
  }

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <div 
      className="layer-row"
      style={{ 
        display:'flex', 
        alignItems:'center', 
        gap:8, 
        padding:'8px 12px', 
        borderRadius:6, 
        background: isSelected ? 'rgba(102,204,255,0.15)' : hidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)', 
        border: isSelected ? '1px solid rgba(102,204,255,0.4)' : hidden ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.12)',
        marginBottom:4,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        opacity: hidden ? 0.5 : 1,
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (!isEditing) {
          e.stopPropagation()
          onSelect()
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      <TypeIcon type={type} />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid #66ccff',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 13,
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            outline: 'none'
          }}
        />
      ) : (
        <div 
          style={{ 
            fontSize:13, 
            color: hidden ? '#a0a0b0' : '#e5e5f0', 
            fontWeight:500,
            flex:1,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '-0.01em'
          }}
          title="Double-click to rename"
        >
          {name}
        </div>
      )}
      
      {/* 3-dot menu button - only visible on hover */}
      {isHovered && (
        <div style={{ position: 'relative' }}>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowMenu(!showMenu); 
            }}
            style={{ 
              background:'none', 
              border:'none', 
              padding:4, 
              borderRadius:4, 
              cursor:'pointer',
              color: '#ccc',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = '#ccc'}
            title="More options"
          >
            <DotsIcon />
          </button>
          
          {/* Dropdown menu */}
          {showMenu && (
            <div 
              ref={menuRef}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'rgba(22,19,33,0.95)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: 4,
                minWidth: 120,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <button
                onClick={handleMenuRename}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#e5e5f0',
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Rename
              </button>
              <button
                onClick={handleMenuDelete}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,107,107,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ 
          background:'none', 
          border:'none', 
          padding:4, 
          borderRadius:4, 
          cursor:'pointer',
          color: hidden ? '#666' : '#ccc',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => e.target.style.color = hidden ? '#888' : '#fff'}
        onMouseLeave={(e) => e.target.style.color = hidden ? '#666' : '#ccc'}
        title={hidden ? 'Show layer' : 'Hide layer'}
      >
        <EyeIcon visible={!hidden} />
      </button>
    </div>
  )
}

const SectionHeader = ({ title, color, type, count, onShowAll, onHideAll }) => (
  <div style={{ 
    display:'flex', 
    justifyContent:'space-between', 
    alignItems:'center', 
    marginBottom:8,
    paddingBottom:6,
    borderBottom: `1px solid ${color}20`
  }}>
    <div style={{ 
      color, 
      fontWeight:600, 
      fontSize:14,
      fontFamily: 'Inter, system-ui, sans-serif',
      letterSpacing: '-0.02em',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      {title}
      <span style={{ 
        fontSize:11, 
        fontWeight:400, 
        color:'#888',
        background: 'rgba(255,255,255,0.1)',
        padding: '2px 6px',
        borderRadius: 12
      }}>
        {count}
      </span>
    </div>
    <div style={{ display:'flex', gap:4 }}>
      <button 
        onClick={onShowAll}
        style={{ 
          fontSize:10, 
          padding:'4px 8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          color: '#ccc',
          cursor: 'pointer',
          fontWeight: 500,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.15)'
          e.target.style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.1)'
          e.target.style.color = '#ccc'
        }}
      >
        Show All
      </button>
      <button 
        onClick={onHideAll}
        style={{ 
          fontSize:10, 
          padding:'4px 8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          color: '#999',
          cursor: 'pointer',
          fontWeight: 500,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.1)'
          e.target.style.color = '#ccc'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.05)'
          e.target.style.color = '#999'
        }}
      >
        Hide All
      </button>
    </div>
  </div>
)

const Section = ({ title, color, type, items }) => {
  const { 
    hiddenItems, 
    toggleItemVisibility, 
    setTypeVisible, 
    getItemName, 
    setItemName, 
    removeEye, 
    removeYarn, 
    removeFeltPiece,
    selectedEyeId,
    selectedYarnId,
    selectedFeltId,
    selectItem
  } = useDecorStore()
  
  if (items.length === 0) return null

  const handleDelete = (id) => {
    if (type === 'eye') removeEye(id)
    else if (type === 'yarn') removeYarn(id)
    else if (type === 'felt') removeFeltPiece(id)
  }

  const getSelectedId = () => {
    if (type === 'eye') return selectedEyeId
    if (type === 'yarn') return selectedYarnId
    if (type === 'felt') return selectedFeltId
    return null
  }
  
  return (
    <div style={{ marginBottom:20 }}>
      <SectionHeader 
        title={title}
        color={color}
        type={type}
        count={items.length}
        onShowAll={() => setTypeVisible(type, true)}
        onHideAll={() => setTypeVisible(type, false)}
      />
      <div>
        {items.map((item) => (
          <LayerRow
            key={`${type}-${item.id}`}
            name={getItemName(type, item.id)}
            id={item.id}
            type={type}
            hidden={hiddenItems?.has?.(`${type}:${item.id}`)}
            isSelected={getSelectedId() === item.id}
            onToggle={() => toggleItemVisibility(type, item.id)}
            onRename={(newName) => setItemName(type, item.id, newName)}
            onDelete={() => handleDelete(item.id)}
            onSelect={() => selectItem(type, item.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default function SceneLayersPanel() {
  const { eyes, yarns, feltPieces } = useDecorStore()

  return (
    <div style={{ 
      background: 'rgba(0,0,0,0.2)', 
      borderRadius: 8, 
      padding: 16,
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <Section title="Eyes" color="#66ccff" type="eye" items={eyes} />
      <Section title="Yarns" color="#ff66cc" type="yarn" items={yarns} />
      <Section title="Felt" color="#66ffcc" type="felt" items={feltPieces} />
      
      {eyes.length === 0 && yarns.length === 0 && feltPieces.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: '#888', 
          fontSize: 13,
          fontStyle: 'italic',
          padding: '20px 0'
        }}>
          No items in scene
        </div>
      )}
    </div>
  )
}