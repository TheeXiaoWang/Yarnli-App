import React from 'react'
import { useSceneStore } from '../../stores/sceneStore'
import { useTransformMode } from '../../contexts/TransformContext'
import { useLayerlineStore } from '../../stores/layerlineStore'

const TopToolbar = ({ onOpenResolution }) => {
  const { clearScene, selectedObject, removeObject, objects, undo, redo, copySelected, mirrorSelected } = useSceneStore()
  const { transformMode, setTransformMode } = useTransformMode()
  const { exportJSON } = useLayerlineStore()

  const [open, setOpen] = React.useState(null)
  const toggle = (name) => setOpen((v) => (v === name ? null : name))
  const close = () => setOpen(null)

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!(e.target.closest && e.target.closest('.menu-root'))) close()
    }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [])

  const Menu = ({ title, name, children }) => (
    <div className="menu-root" style={{ position: 'relative', marginRight: 8 }}>
      <button
        className="menu-trigger"
        onClick={() => toggle(name)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '8px 14px',
          color: '#efeaff',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: 0.2,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)'
        }}
      >
        {title} <span style={{ marginLeft: 4 }}>▾</span>
      </button>
      {open === name && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, background: 'rgba(22,19,33,0.98)', border: '1px solid #3a3550', borderRadius: 12, padding: 8, minWidth: 200, zIndex: 50, boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}>
          {children}
        </div>
      )}
    </div>
  )

  const Item = ({ label, onClick, danger, disabled }) => (
    <button
      className="btn"
      disabled={disabled}
      onClick={() => { onClick?.(); close() }}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', color: danger ? '#ff9a9a' : '#f4f0ff', fontSize: 14 }}
    >
      {label}
    </button>
  )

  return (
    <div className="top-toolbar" style={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%', padding: '10px 12px',
      background: 'linear-gradient(180deg, #2b2340 0%, #231c36 55%, #1f1830 100%)',
      borderBottom: '1px solid rgba(163,144,216,0.25)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)', position: 'relative', zIndex: 5 }}>
      <style>{`
        .top-toolbar .menu-trigger:hover { background: rgba(255,255,255,0.08); }
        .top-toolbar .menu-trigger:active { background: rgba(255,255,255,0.14); }
      `}</style>
      <Menu title="File" name="file">
        <Item label="New" />
        <Item label="Open" />
        <Item label="Save" />
        <Item label="Export" onClick={() => {
          const data = exportJSON()
          const blob = new Blob([data], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'layerlines.json'
          a.click()
          URL.revokeObjectURL(url)
        }} />
      </Menu>

      <Menu title="Edit" name="edit">
        <Item label="Undo" onClick={undo} />
        <Item label="Redo" onClick={redo} />
        <div style={{ height: 1, background: '#3a3550', margin: '4px 0' }} />
        <Item label="Copy" onClick={copySelected} disabled={!selectedObject} />
        <Item label="Mirror X" onClick={() => mirrorSelected('x', 0)} disabled={!selectedObject} />
        <Item label="Mirror Y" onClick={() => mirrorSelected('y', 0)} disabled={!selectedObject} />
        <Item label="Mirror Z" onClick={() => mirrorSelected('z', 0)} disabled={!selectedObject} />
        <div style={{ height: 1, background: '#3a3550', margin: '4px 0' }} />
        <Item label="Delete" onClick={() => selectedObject && removeObject(selectedObject.id)} danger disabled={!selectedObject} />
        <Item label="Clear All" onClick={clearScene} danger />
      </Menu>

      <Menu title="Transform" name="transform">
        <Item label={`${transformMode === 'translate' ? '✓ ' : ''}Move`} onClick={() => setTransformMode('translate')} />
        <Item label={`${transformMode === 'rotate' ? '✓ ' : ''}Rotate`} onClick={() => setTransformMode('rotate')} />
        <Item label={`${transformMode === 'scale' ? '✓ ' : ''}Scale`} onClick={() => setTransformMode('scale')} />
      </Menu>

      <Menu title="Display" name="display">
        <Item label="Resolution…" onClick={onOpenResolution} />
      </Menu>
    </div>
  )
}

export default TopToolbar
