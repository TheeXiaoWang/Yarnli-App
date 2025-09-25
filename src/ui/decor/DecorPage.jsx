import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor, AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import DecorSidebar from './DecorSidebar'
import SceneLayersPanel from './SceneLayersPanel'
import SelectionPropertiesPanel from './SelectionPropertiesPanel'
import DecorScene from './DecorScene'
import FeltModal from './components/felt/FeltModal'
import '../editor/dev-stage.css'

const DecorPage = () => {
  const [dpr, setDpr] = useState([1, 1.25])

  return (
    <div className="cad-layout">
      <div className="top-toolbar" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}>
        <button
          onClick={() => { window.location.hash = '#/editor' }}
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #3a3550', background:'rgba(255,255,255,0.05)', color:'#efeaff', fontWeight:600 }}
        >← Back to Editor</button>
        <div style={{ color:'#cfc3ff', fontWeight:700, letterSpacing:0.4 }}>Decor Mode</div>
      </div>

      <div className="left-sidebar">
        <DecorSidebar />
      </div>

      <div className="canvas-container">
        <Canvas
          camera={{ position:[10,10,10], fov: 75 }}
          style={{ background: 'transparent' }}
          gl={{ antialias:false, alpha:false, powerPreference:'high-performance', stencil:false, depth:true }}
          dpr={dpr}
          frameloop="demand"
          shadows={false}
        >
          <PerformanceMonitor onDecline={() => setDpr([0.75,1])} onIncline={() => setDpr([1,1.25])} />
          <AdaptiveDpr />
          <AdaptiveEvents />
          {/* Scene background only (lighter, no extra lighting) */}
          <color attach="background" args={["#2f3242"]} />
          {/* Keep the original minimal lighting similar to editor */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10,10,5]} intensity={0.8} />

          <DecorScene />
          <OrbitControls 
            enableKeys={false} 
            maxDistance={50} 
            minDistance={2} 
            enableDamping={false}
            rotateSpeed={0.45}
          />
          <Preload all />
        </Canvas>
      </div>

      <div className="right-sidebar" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ color:'#a0a0ff', fontWeight:600 }}>Layers</div>
        <SceneLayersPanel />
        <SelectionPropertiesPanel />
        <div style={{ color:'#a0a0ff', fontWeight:600, marginTop:12 }}>Tips</div>
        <div style={{ fontSize:13, color:'#ddd' }}>
          Select tool: Eyes places a hemisphere at a grid point. Yarn creates a noodle from first clicked grid point to second. Felt opens cutting modal.
        </div>
      </div>

      {/* Felt Modal - rendered at page level */}
      <FeltModal />
    </div>
  )
}

export default DecorPage


