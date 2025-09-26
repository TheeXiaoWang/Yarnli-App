import React, { useState, useMemo } from 'react'
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

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const ChevronIcon = ({ expanded }) => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{ 
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }}
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
)

const TypeIcon = ({ type, color }) => {
  if (type === 'eye') return <div style={{ width:16, height:16, borderRadius:'50%', background:'#66ccff', border:'2px solid #4a90e2' }} />
  if (type === 'yarn') {
    const hexColor = color ? `#${color.toString(16).padStart(6, '0')}` : '#ff66cc'
    return <div style={{ width:16, height:3, borderRadius:2, background: hexColor }} />
  }
  if (type === 'felt') return <div style={{ width:16, height:16, borderRadius:3, background:'#66ffcc', border:'1px solid #4dc9a0' }} />
  return null
}

const LayerRow = ({ name, id, type, hidden, onToggle, onRename, onDelete, onSelect, isSelected, color }) => {
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

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      className="layer-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: isEditing ? 'text' : 'pointer',
        transition: 'all 0.15s ease',
        background: isSelected ? 'rgba(102,204,255,0.15)' : hidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
        border: isSelected ? '1px solid rgba(102,204,255,0.4)' : hidden ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: isSelected ? '0 0 12px rgba(102,204,255,0.2)' : 'none',
        opacity: hidden ? 0.5 : 1,
        fontSize: 13,
        color: isSelected ? '#e5f3ff' : hidden ? '#888' : '#e5e5f0',
        marginBottom: 4
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
      <TypeIcon type={type} color={color} />
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
            border: '1px solid rgba(102,204,255,0.6)',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#e5f3ff',
            fontSize: 13,
            outline: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      )}

      {isHovered && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              padding: '2px 6px',
              color: '#e5e5f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: 12,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            <DotsIcon />
          </button>
          {showMenu && (
            <div
              ref={menuRef}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'rgba(40,40,60,0.95)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 1000,
                minWidth: 100,
                backdropFilter: 'blur(8px)'
              }}
            >
              <button
                onClick={handleMenuRename}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e5e5f0',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Rename
              </button>
              <button
                onClick={handleMenuDelete}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff8888',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,136,136,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          padding: '2px 6px',
          color: !hidden ? '#66ff99' : '#ff6666',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          fontSize: 12,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
      >
        <EyeIcon visible={!hidden} />
      </button>
    </div>
  )
}

const GroupHeader = ({ title, color, type, count, expanded, onToggleExpanded, onShowAll, onHideAll, visibleCount }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    marginBottom: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    color: color
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={onToggleExpanded}>
      <ChevronIcon expanded={expanded} />
      <span>{title}</span>
      <span style={{ 
        fontSize: 12, 
        color: '#aaa', 
        background: 'rgba(255,255,255,0.1)', 
        padding: '2px 6px', 
        borderRadius: 12 
      }}>
        {visibleCount}/{count}
      </span>
    </div>
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onShowAll() }}
        style={{
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          color: '#e5e5f0',
          fontSize: 11,
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
      >
        Show All
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onHideAll() }}
        style={{
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          color: '#e5e5f0',
          fontSize: 11,
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
      >
        Hide All
      </button>
    </div>
  </div>
)

const Group = ({ title, color, type, items, expanded, onToggleExpanded }) => {
  const {
    hiddenItems, toggleItemVisibility, setTypeVisible, getItemName, setItemName,
    removeEye, removeYarn, removeFeltPiece,
    selectedEyeId, selectedYarnId, selectedFeltId, selectItem
  } = useDecorStore()

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

  const visibleCount = items.filter(item => !hiddenItems?.has?.(`${type}:${item.id}`)).length

  return (
    <div style={{ marginBottom: 16 }}>
      <GroupHeader
        title={title}
        color={color}
        type={type}
        count={items.length}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onShowAll={() => setTypeVisible(type, true)}
        onHideAll={() => setTypeVisible(type, false)}
        visibleCount={visibleCount}
      />
      {expanded && (
        <div style={{ paddingLeft: 8 }}>
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
              color={type === 'yarn' ? item.color : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SceneLayersPanel() {
  const { eyes, yarns, feltPieces, hiddenItems, setTypeVisible, getItemName } = useDecorStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({
    eyes: true,
    yarns: true,
    felt: true
  })

  console.log('SceneLayersPanel render:', { eyes: eyes.length, yarns: yarns.length, feltPieces: feltPieces.length })

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!showTypeDropdown) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setShowTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTypeDropdown])

  const allItems = useMemo(() => [
    ...eyes.map(e => ({ ...e, type: 'eye' })),
    ...yarns.map(y => ({ ...y, type: 'yarn' })),
    ...feltPieces.map(f => ({ ...f, type: 'felt' }))
  ], [eyes, yarns, feltPieces])

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const itemName = getItemName(item.type, item.id)
      const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           `${item.type} ${item.id}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [allItems, searchTerm, typeFilter, getItemName])

  const groupedItems = useMemo(() => {
    const groups = {
      eyes: filteredItems.filter(item => item.type === 'eye'),
      yarns: filteredItems.filter(item => item.type === 'yarn'),
      felt: filteredItems.filter(item => item.type === 'felt')
    }
    return groups
  }, [filteredItems])

  const toggleGroupExpansion = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const handleGlobalShowAll = () => {
    setTypeVisible('eye', true)
    setTypeVisible('yarn', true)
    setTypeVisible('felt', true)
  }

  const handleGlobalHideAll = () => {
    setTypeVisible('eye', false)
    setTypeVisible('yarn', false)
    setTypeVisible('felt', false)
  }

  const totalItems = allItems.length
  const hasItems = totalItems > 0

  // Show empty state in content area if no items
  const emptyState = !hasItems ? (
    <div style={{
      padding: 24,
      color: '#ccc',
      textAlign: 'center',
      fontSize: 13
    }}>
      No items in scene yet
    </div>
  ) : null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%' // Take full height of container
    }}>
      {/* Persistent Header */}
      <div style={{
        padding: 16,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.08)',
        flexShrink: 0
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#e5e5f0',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#aaa',
            pointerEvents: 'none'
          }}>
            <SearchIcon />
          </div>
        </div>

        {/* Type Filter and Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ position: 'relative' }} data-dropdown>
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#e5e5f0',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 100,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.12)'
                e.target.style.borderColor = 'rgba(255,255,255,0.25)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.08)'
                e.target.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            >
              <span>{typeFilter === 'all' ? 'All Types' : typeFilter === 'eye' ? 'Eyes' : typeFilter === 'yarn' ? 'Yarns' : 'Felt'}</span>
              <ChevronIcon expanded={showTypeDropdown} />
            </button>
            
            {showTypeDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 6,
                padding: 4,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'eye', label: 'Eyes' },
                  { value: 'yarn', label: 'Yarns' },
                  { value: 'felt', label: 'Felt' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTypeFilter(option.value)
                      setShowTypeDropdown(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: typeFilter === option.value ? 'rgba(255,255,255,0.15)' : 'transparent',
                      border: 'none',
                      color: typeFilter === option.value ? '#ffffff' : '#e5e5f0',
                      fontSize: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 4,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (typeFilter !== option.value) {
                        e.target.style.background = 'rgba(255,255,255,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (typeFilter !== option.value) {
                        e.target.style.background = 'transparent'
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleGlobalShowAll}
              style={{
                padding: '6px 12px',
                background: 'rgba(102,255,153,0.2)',
                border: '1px solid rgba(102,255,153,0.4)',
                borderRadius: 6,
                color: '#66ff99',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(102,255,153,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(102,255,153,0.2)'}
            >
              Show All
            </button>
            <button
              onClick={handleGlobalHideAll}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,102,102,0.2)',
                border: '1px solid rgba(255,102,102,0.4)',
                borderRadius: 6,
                color: '#ff6666',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,102,102,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,102,102,0.2)'}
            >
              Hide All
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {emptyState || (
          <>
            {groupedItems.eyes.length > 0 && (
              <Group
                title="Eyes"
                color="#66ccff"
                type="eye"
                items={groupedItems.eyes}
                expanded={expandedGroups.eyes}
                onToggleExpanded={() => toggleGroupExpansion('eyes')}
              />
            )}
            {groupedItems.yarns.length > 0 && (
              <Group
                title="Yarns"
                color="#ff66cc"
                type="yarn"
                items={groupedItems.yarns}
                expanded={expandedGroups.yarns}
                onToggleExpanded={() => toggleGroupExpansion('yarns')}
              />
            )}
            {groupedItems.felt.length > 0 && (
              <Group
                title="Felt"
                color="#66ffcc"
                type="felt"
                items={groupedItems.felt}
                expanded={expandedGroups.felt}
                onToggleExpanded={() => toggleGroupExpansion('felt')}
              />
            )}
            {filteredItems.length === 0 && hasItems && (
              <div style={{
                textAlign: 'center',
                padding: 32,
                color: '#888',
                fontSize: 13
              }}>
                <div style={{ marginBottom: 8 }}>No items match your search</div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  Try adjusting your search term or filter
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}