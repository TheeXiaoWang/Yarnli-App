import React, { useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor, AdaptiveDpr, AdaptiveEvents, Preload, GizmoHelper, GizmoViewcube } from '@react-three/drei'
import YarnStage from './components/DevStage/YarnStage'
import ResolutionModal from './components/DevStage/ResolutionModal'
import CustomViewCube from './components/DevStage/CustomViewCube'
import Scene3D from './components/DevStage/Scene3D'
import Home from './components/home/Home'
import GalleryPage from './components/gallery/GalleryPage'
import TutorialPage from './components/tutorial/TutorialPage'
import TopToolbar from './components/DevStage/TopToolbar'
import LeftSidebar from './components/DevStage/LeftSidebar'
import RightSidebar from './components/DevStage/RightSidebar'
import { useNodeStore } from './stores/nodeStore'
import StatusBar from './components/DevStage/StatusBar'
import { useSceneStore } from './stores/sceneStore'
import { TransformProvider, useTransformMode } from './contexts/TransformContext'
import * as THREE from 'three'
import { useLayerlineStore } from './stores/layerlineStore'

function App() {
  const { objects, selectedObject, undo, redo } = useSceneStore()
  const [dpr, setDpr] = useState([1, 1.25])
  const [autoDpr, setAutoDpr] = useState(true)
  const [lowQuality, setLowQuality] = useState(false)
  const [showRes, setShowRes] = useState(false)
  const [route, setRoute] = useState(() => window?.location?.hash || '#/')

  useEffect(() => {
    const onHash = () => setRoute(window?.location?.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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

  if (route === '#/' || route === '' || route === '#') return <Home />
  if (route === '#/gallery') return <GalleryPage />
  if (route === '#/tutorial') return <TutorialPage />
  if (route !== '#/editor') return <Home />

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
          <OverlaySliders />
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

  // Pure clamp once per frame to avoid recursive change/update loops
  const clampBusyRef = React.useRef(false)
  useFrame(() => {
    const c = controlsRef.current
    if (!c || clampBusyRef.current) return
    clampBusyRef.current = true
    const eps = 0.001
    if (c.object.position.y < eps) c.object.position.y = eps
    if (c.target.y < eps) c.target.y = eps
    clampBusyRef.current = false
  })

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

function OverlaySliders() {
  const { generated } = useLayerlineStore()
  const { nodes, transitionOps, ui, setVisibility, nextLayersPoints } = useNodeStore()
  const maxLayers = (nextLayersPoints?.length || 0)
  let lastLayerNodes = 0
  const layerVisible = ui.nodeLayerVisibleCount || 0
  if (layerVisible > 0 && nextLayersPoints && nextLayersPoints.length > 0) {
    const idx = Math.min(layerVisible - 1, nextLayersPoints.length - 1)
    lastLayerNodes = nextLayersPoints[idx]?.nodes?.length || 0
  } else {
    lastLayerNodes = nodes?.nodes?.length || 0
  }
  return (
    <div>
      {/* Right-side vertical slider: Visible node layers (only) */}
      <input 
        type="range" 
        min={0} 
        max={Math.max(0, maxLayers)} 
        value={Math.min(ui.nodeLayerVisibleCount || 0, Math.max(0, maxLayers))}
        onChange={(e)=>setVisibility({ nodeLayerVisibleCount: Number(e.target.value) })}
        style={{ position:'fixed', right:48, top:'50%', transform:'translateY(-50%) rotate(270deg)', width:'40vh', zIndex:1000 }}
      />

      {/* Bottom-centered horizontal slider: Node index path */}
      <input 
        type="range" 
        min={0} 
        max={Math.max(1, lastLayerNodes)} 
        value={Math.min(ui.nodeVisibleCount || 1, Math.max(1, lastLayerNodes))}
        onChange={(e)=>setVisibility({ nodeVisibleCount: Number(e.target.value) })}
        style={{ position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:16, width:'40vw', zIndex:1000 }}
      />
    </div>
  )
}
