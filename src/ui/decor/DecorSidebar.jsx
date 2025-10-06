import React from 'react'
import { useDecorStore } from '../../app/stores/decorStore'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import FeltPanel from './components/felt/FeltPanel'

const DecorSidebar = () => {
  const { tool, setTool, showGridPoints, toggleGridPoints, showGridVectors, toggleGridVectors, showOnlyNearGridPoints, toggleOnlyNearGridPoints, showAllGridPoints, toggleShowAllGridPoints, gridYawStartDeg, gridYawEndDeg, setGridYawStartDeg, setGridYawEndDeg, gridAngularOffsetDeg, setGridAngularOffsetDeg, alwaysShowAllNodes, toggleAlwaysShowAllNodes, eyes, yarns, feltPieces, selectedYarnId, removeYarn, clearAll, cancelYarn, eyeScale, setEyeScale, selectionRadiusPx, setSelectionRadiusPx, yarnOrbitalDistance, setYarnOrbitalDistance, curvatureCompensation, setCurvatureCompensation, showOrbitProxy, toggleOrbitProxy, showSourceObject, toggleSourceObject, showDebugRaycastMesh, toggleDebugRaycastMesh, showFeltVertices, toggleFeltVertices, updateYarnCurvature, openFeltModal, feltColor, setFeltColor, clearUsedPoints, hiddenItems, toggleItemVisibility, setTypeVisible } = useDecorStore()
  const { settings } = useLayerlineStore()
  const yarnLevel = Number(settings?.yarnSizeLevel) || 4

  return (
    <div>
      <div className="sidebar-section">
        <h3>Decor Tools</h3>
        <div className="tool-grid">
          <button className={`tool-btn ${tool==='eyes'?'active':''}`} onClick={() => setTool('eyes')}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
            Eyes
          </button>
          <button className={`tool-btn ${tool==='yarn'?'active':''}`} onClick={() => setTool('yarn')}>
            <svg viewBox="0 0 24 24"><path d="M3 12c4-6 14 6 18 0" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            Yarn
          </button>
          <button className={`tool-btn ${tool==='felt'?'active':''}`} onClick={() => setTool('felt')}>
            <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 10h8M8 14h6" stroke="currentColor" strokeWidth="1"/></svg>
            Felt
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Grid & Snapping</h3>
        <button 
          onClick={clearUsedPoints}
          style={{
            padding: '4px 8px',
            backgroundColor: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '12px',
            marginBottom: '8px'
          }}
        >
          Clear Used Points
        </button>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={showGridPoints} onChange={toggleGridPoints} /> Show grid points
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <input type="checkbox" checked={showOnlyNearGridPoints} onChange={toggleOnlyNearGridPoints} /> Only show near surface
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <input type="checkbox" checked={showAllGridPoints} onChange={toggleShowAllGridPoints} /> Show all grid points
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <input type="checkbox" checked={showGridVectors} onChange={toggleGridVectors} /> Show grid vectors
        </label>
        {showGridVectors && (
          <div style={{ marginTop:8, padding:8, backgroundColor:'rgba(0,0,0,0.1)', borderRadius:4 }}>
            <div style={{ fontSize:12, color:'#aaa', marginBottom:8 }}>Vector Orientation Tuning</div>
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 48px', gap:8 }}>
              <span style={{ fontSize:13, color:'#ccc' }}>Angular offset</span>
              <input type="range" min={-180} max={180} value={gridAngularOffsetDeg} onChange={(e)=>setGridAngularOffsetDeg(e.target.value)} />
              <span style={{ fontSize:12, color:'#aaa' }}>{gridAngularOffsetDeg}°</span>
              <span style={{ fontSize:13, color:'#ccc' }}>Yaw start</span>
              <input type="range" min={-180} max={180} value={gridYawStartDeg} onChange={(e)=>setGridYawStartDeg(e.target.value)} />
              <span style={{ fontSize:12, color:'#aaa' }}>{gridYawStartDeg}°</span>
              <span style={{ fontSize:13, color:'#ccc' }}>Yaw end</span>
              <input type="range" min={-180} max={180} value={gridYawEndDeg} onChange={(e)=>setGridYawEndDeg(e.target.value)} />
              <span style={{ fontSize:12, color:'#aaa' }}>{gridYawEndDeg}°</span>
            </div>
            <div style={{ fontSize:11, color:'#888', marginTop:4 }}>
              Interpolates yaw rotation from start to end across each ring segment
            </div>
          </div>
        )}
        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <input type="checkbox" checked={alwaysShowAllNodes} onChange={toggleAlwaysShowAllNodes} /> Always show all nodes
        </label>
      </div>

      <div className="sidebar-section">
        <h3>Eyes</h3>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
          <span style={{ fontSize:13, color:'#ccc', width:80 }}>Pick radius</span>
          <input type="range" min={8} max={150} value={selectionRadiusPx} onChange={(e)=>setSelectionRadiusPx(Number(e.target.value))} />
          <span style={{ fontSize:12, color:'#aaa' }}>{selectionRadiusPx}px</span>
        </div>
        <div style={{ fontSize:11, color:'#888', marginTop:8 }}>
          • Select an eye in the Layers panel to adjust size<br/>
          • Pick radius: hover detection sensitivity
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Yarns</h3>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <input type="checkbox" checked={showOrbitProxy} onChange={toggleOrbitProxy} /> Show orbit proxy
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <input type="checkbox" checked={showSourceObject} onChange={toggleSourceObject} /> Show source object
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <input type="checkbox" checked={showDebugRaycastMesh} onChange={toggleDebugRaycastMesh} /> Show raycast mesh (debug)
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <input type="checkbox" checked={showFeltVertices} onChange={toggleFeltVertices} /> Show felt vertices (debug)
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:13, color:'#ccc', width:80 }}>Orbit distance</span>
          <input 
            type="range" 
            min={0.01} 
            max={2.0} 
            step={0.01}
            value={yarnOrbitalDistance} 
            onChange={(e)=>setYarnOrbitalDistance(Number(e.target.value))} 
          />
          <span style={{ fontSize:12, color:'#aaa' }}>{yarnOrbitalDistance.toFixed(2)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:13, color:'#ccc', width:80 }}>Curve tuning</span>
          <input 
            type="range" 
            min={0.0} 
            max={1.0} 
            step={0.05}
            value={curvatureCompensation} 
            onChange={(e)=>setCurvatureCompensation(Number(e.target.value))} 
          />
          <span style={{ fontSize:12, color:'#aaa' }}>{(curvatureCompensation * 100).toFixed(0)}%</span>
        </div>
        <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>
          • Select items in Layers panel or click in scene<br/>
          • Two clicks to create yarn<br/>
          • Orbit distance: yarn surface offset
        </div>
      </div>

      {/* Felt Panel - Only show when felt tool is active */}
      {tool === 'felt' && <FeltPanel />}

      <div className="sidebar-section">
        <h3>Scene</h3>
        <div style={{ display:'flex', gap:8 }}>
          <button className="tool-btn" onClick={clearAll}>Clear Decor</button>
          <button className="tool-btn" onClick={cancelYarn}>Cancel Yarn</button>
        </div>
        <div style={{ marginTop:12, color:'#ccc', fontSize:13 }}>Eyes: {eyes.length} · Yarns: {yarns.length} · Felt: {feltPieces.length} · Yarn size level: {yarnLevel}</div>
      </div>
    </div>
  )
}

export default DecorSidebar


