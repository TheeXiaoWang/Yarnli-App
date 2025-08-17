import React, { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor, AdaptiveDpr, AdaptiveEvents, Preload, GizmoHelper, GizmoViewcube } from '@react-three/drei'
import YarnStage from './components/YarnStage'
import ResolutionModal from './components/ResolutionModal'
import CustomViewCube from './components/CustomViewCube'
import Scene3D from './components/Scene3D'
import TopToolbar from './components/TopToolbar'
import LeftSidebar from './components/LeftSidebar'
import RightSidebar from './components/RightSidebar'
import StatusBar from './components/StatusBar'
import { useSceneStore } from './stores/sceneStore'
import { TransformProvider, useTransformMode } from './contexts/TransformContext'
import * as THREE from 'three'

function App() {
  const { objects, selectedObject, undo, redo } = useSceneStore()
  const [dpr, setDpr] = useState([1, 1.25])
  const [autoDpr, setAutoDpr] = useState(true)
  const [lowQuality, setLowQuality] = useState(false)
  const [showRes, setShowRes] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey
      if (!ctrl) return
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  function Hotkeys() {
    const { setTransformMode } = useTransformMode()
    useEffect(() => {
      const handler = (e) => {
        const active = document.activeElement
        const tag = (active?.tagName || '').toLowerCase()
        const isTyping = tag === 'input' || tag === 'textarea' || active?.isContentEditable
        if (isTyping) return
        const k = e.key.toLowerCase()
        if (k === 'g') { e.preventDefault(); setTransformMode('translate') }
        else if (k === 'r') { e.preventDefault(); setTransformMode('rotate') }
        else if (k === 's') { e.preventDefault(); setTransformMode('scale') }
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [setTransformMode])
    return null
  }

  return (
    <TransformProvider>
      <div className="cad-layout">
        <Hotkeys />
        {/* Top Toolbar */}
        <TopToolbar onOpenResolution={() => setShowRes(true)} />
        
        {/* Left Sidebar - Tools */}
        <LeftSidebar />
        
        {/* 3D Canvas */}
        <div className="canvas-container">
          <Canvas
            camera={{ position: [10, 10, 10], fov: 75 }}
            style={{ background: 'linear-gradient(180deg, #2a1f3d 0%, #1f1830 100%)' }}
            gl={{ 
              antialias: false,
              alpha: false,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            dpr={dpr}
            frameloop="demand"
            shadows={false}
            performance={{ min: 0.7 }}
          >
            <PerformanceMonitor 
              onDecline={() => { if (autoDpr) { setDpr([0.75, 1]); setLowQuality(true) } }} 
              onIncline={() => { if (autoDpr) { setDpr([1, 1.25]); setLowQuality(false) } }} 
            />
            <AdaptiveDpr />
            <AdaptiveEvents />

            <Scene3D />
            <OrbitControlsWrapper />
            <YarnStage radius={22} rings={lowQuality ? 10 : 18} spokes={lowQuality ? 8 : 16} />
            <ambientLight intensity={0.5} />
            {/* No shadow casting to keep it lightweight */}
            <directionalLight position={[10, 10, 5]} intensity={0.8} />

            {/* View Cube with ground clamp on change */}
            <GizmoHelper alignment="top-left" margin={[96, 96]} onUpdate={(matrix, camera) => {
              // If the cube reorients the camera, keep camera and target above ground
              const eps = 0.001
              if (camera.position.y < eps) camera.position.y = eps
              if (camera.target && camera.target.y < eps) camera.target.y = eps
              // For OrbitControls (no target on camera), lift the default controls if present
              const controls = (camera && camera.controls) || (window.__orbitControlsRef && window.__orbitControlsRef.current)
              if (controls) {
                if (controls.object.position.y < eps) controls.object.position.y = eps
                if (controls.target.y < eps) controls.target.y = eps

                // Disallow downward diagonals: if view vector points downward (y < 0),
                // mirror it to the corresponding upward orientation.
                const view = controls.object.position.clone().sub(controls.target)
                if (view.y < 0) {
                  view.y = Math.abs(view.y)
                  controls.object.position.copy(controls.target.clone().add(view))
                }
                controls.update?.()
              }
            }}>
              {/* beveled shell */}
              <CustomViewCube scale={1.6} />
              {/* interactive labels */}
              <group scale={1.45}>
                <GizmoViewcube
                  opacity={0.9}
                  color="#5a4b76"
                  hoverColor="#cbb9ff"
                  textColor="#f4f1f7"
                  strokeColor="#a390d8"
                  faces={["RIGHT","LEFT","TOP","BOTTOM","FRONT","BACK"]}
                />
                {/* Place blocker AFTER the cube so it has first pick in the event system order */}
                <mesh
                  position={[0, -0.1, 1]}
                  renderOrder={9999}
                  onPointerOver={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onPointerEnter={(e) => e.stopPropagation()}
                  onPointerLeave={(e) => e.stopPropagation()}
                >
                  {/* Big enough to cover bottom face, lower edges and corners; placed in front of cube */}
                  <boxGeometry args={[2.2, 1.6, 0.2]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
                </mesh>
              </group>
            </GizmoHelper>

            <Preload all />
          </Canvas>
          
          {/* Status Bar */}
          <StatusBar />
          <ResolutionModal 
            open={showRes}
            onClose={() => setShowRes(false)}
            onApply={(choice) => {
              if (choice === 'auto') { setAutoDpr(true); setShowRes(false); return }
              setAutoDpr(false)
              setDpr(choice)
              setShowRes(false)
            }}
            current={dpr}
          />
        </div>
        
        {/* Right Sidebar - Properties */}
        <RightSidebar />
      </div>
    </TransformProvider>
  )
}

// Separate component to use the context inside the Canvas
function OrbitControlsWrapper() {
  const { isTransforming } = useTransformMode()
  const controlsRef = React.useRef()
  // Expose for GizmoHelper onUpdate fallback
  React.useEffect(()=>{ window.__orbitControlsRef = controlsRef; return () => { if (window.__orbitControlsRef===controlsRef) delete window.__orbitControlsRef } },[])

  React.useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const keepAboveGround = () => {
      const eps = 0.001
      const liftTarget = c.target.y < eps ? eps - c.target.y : 0
      const liftCamera = c.object.position.y < eps ? eps - c.object.position.y : 0
      const dy = Math.max(liftTarget, liftCamera)
      if (dy > 0) {
        c.target.y += dy
        c.object.position.y += dy
        c.update()
      }
    }
    c.addEventListener('change', keepAboveGround)
    return () => c.removeEventListener('change', keepAboveGround)
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!isTransforming}
      enableZoom={!isTransforming}
      enableRotate={!isTransforming}
      maxDistance={50}
      minDistance={2}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.8}
      panSpeed={0.8}
      zoomSpeed={0.8}
      enableKeys={false}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI / 2 - 0.02}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  )
}

export default App
