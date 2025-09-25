import React, { useMemo, useCallback } from 'react'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { useNodeStore } from '../../app/stores/nodeStore'
import { useSceneStore } from '../../app/stores/sceneStore'
import { useDecorStore } from '../../app/stores/decorStore'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import { STITCH_TYPES } from '../../constants/stitchTypes'
import GridPoints from './components/grid/GridPoints'
import EyesList from './components/eyes/EyesList'
import YarnList from './components/yarn/YarnList'
import OrbitProxy from './components/yarn/OrbitProxy'
import EditorObjectProxy from './components/yarn/EditorObjectProxy'
import DecorSourceObject from './components/source/DecorSourceObject'
import AllEditorObjects from './components/source/AllEditorObjects'
import FeltList from './components/felt/FeltList'
import FeltPlacement from './components/felt/FeltPlacement'
import FeltRaycastTargets from './components/felt/FeltRaycastTargets'
import NodeLayers from './components/nodes/NodeLayers'
import { resolveSourceContext, getLayerInfo } from '../../app/utils/sourceResolver'

const DecorScene = () => {
    const { generated, settings } = useLayerlineStore()
    const { selectedObject } = useSceneStore()
    
    // Debug selectedObject state
    React.useEffect(() => {
        console.log('🟪 DecorScene selectedObject changed:', selectedObject)
        console.log('🟪 Global editor object exists:', !!window.__EDITOR_SOURCE_OBJECT__)
        console.log('🟪 Global editor object details:', window.__EDITOR_SOURCE_OBJECT__)
        
        // Check sceneStore for all objects
        const { objects } = useSceneStore.getState()
        console.log('🟪 All objects in scene store:', objects)
        console.log('🟪 Number of objects:', objects.length)
    }, [selectedObject])

    // Debug mount effect - populate global array from scene store if empty
    React.useEffect(() => {
        console.log('🟪 DecorScene mount effect - checking for objects')
        
        // Check sceneStore for all objects
        const { objects } = useSceneStore.getState()
        console.log('🟪 All objects in scene store:', objects)
        console.log('🟪 Number of objects:', objects.length)
        
        // Clear any fallback objects from global array
        if (window.__EDITOR_ALL_OBJECTS__) {
            window.__EDITOR_ALL_OBJECTS__ = window.__EDITOR_ALL_OBJECTS__.filter(obj => obj.id !== 'fallback')
            console.log('🟪 Removed any fallback objects from global array')
        }
        
        // If global array is empty but scene store has objects, populate it
        if ((!window.__EDITOR_ALL_OBJECTS__ || window.__EDITOR_ALL_OBJECTS__.length === 0) && objects.length > 0) {
            console.log('🟪 Global array empty but scene store has objects - populating from scene store')
            window.__EDITOR_ALL_OBJECTS__ = objects.map(obj => ({
                id: obj.id,
                mesh: null, // No mesh reference available, will create fallback
                object: obj
            }))
            console.log('🟪 Populated global array with', window.__EDITOR_ALL_OBJECTS__.length, 'objects from scene store')
        }
        
        // Check global array
        console.log('🟪 Global editor objects:', window.__EDITOR_ALL_OBJECTS__)
        console.log('🟪 Global editor objects length:', window.__EDITOR_ALL_OBJECTS__?.length || 0)
    }, []) // Empty dependency array - run once on mount
    const { tool, showGridPoints, alwaysShowAllNodes, addEyeAt, startOrFinishYarnAt, eyes, yarns, feltPieces, pendingYarnStart, selectedYarnId, selectYarn, removeYarn, clearYarnSelection, addFeltPiece, removeFeltPiece, yarnRadiusFromLevel, eyeScale, yarnOrbitalDistance, curvatureCompensation, showOrbitProxy, showSourceObject } = useDecorStore()
    
    // Calculate dynamic orbital distance based on node size
    const dynamicOrbitalDistance = React.useMemo(() => {
        const yarnLevel = Number(settings?.yarnSizeLevel) || 4
        const stitchType = settings?.magicRingStitchType || 'sc'
        
        try {
            // Use the same calculation as NodeViewer.jsx for accurate node dimensions
            const baseDims = computeStitchDimensions({ 
                sizeLevel: yarnLevel, 
                baseWidth: 1, 
                baseHeight: 1 
            })
            
            // Get stitch profile to determine node dimensions
            const profile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc
            
            if (!profile || typeof profile.widthMul === 'undefined') {
                console.warn('Invalid stitch profile, using defaults')
                return yarnOrbitalDistance
            }
            
            const scaledWidth = baseDims.width * (profile.widthMul ?? 1.0)
            const scaledHeight = baseDims.height * (profile.heightMul ?? 1.0)
            const scaledDepth = baseDims.width * (profile.depthMul ?? 0.5)
            
            // Map dimensions to render scale in scene units (matches NodeViewer exactly)
            const scaleWidth = Math.max(0.0025, scaledWidth * 0.5)
            const scaleHeight = Math.max(0.0025, scaledHeight * 0.5)
            const scaleDepth = Math.max(0.0025, scaledDepth * 0.5)
            
            // Calculate orbital distance to hover just above the nodes
            // Need to clear the node surface but stay close
            const maxNodeDimension = Math.max(scaleWidth/2, scaleHeight/2, scaleDepth/2)
            
            // Use the node dimension plus a very small clearance to hover just above the surface
            const clearance = 0.1 // Ultra minimal clearance - extremely close to nodes
            const calculatedOrbitalDistance = maxNodeDimension + clearance
            
            console.log('🟡 Dynamic orbital distance calculation:', {
                yarnLevel,
                stitchType,
                baseDims,
                profile: { widthMul: profile.widthMul, heightMul: profile.heightMul, depthMul: profile.depthMul },
                nodeScale: { width: scaleWidth, height: scaleHeight, depth: scaleDepth },
                maxNodeDimension,
                clearance,
                calculatedOrbitalDistance,
                userOrbitalDistance: yarnOrbitalDistance
            })
            
            // Return the calculated distance (no minimum constraint - allow very small distances)
            return calculatedOrbitalDistance
            
        } catch (error) {
            console.warn('Failed to calculate dynamic orbital distance:', error)
            return yarnOrbitalDistance
        }
    }, [settings?.yarnSizeLevel, settings?.magicRingStitchType, yarnOrbitalDistance])
    
    // Debug showSourceObject state
    React.useEffect(() => {
        console.log('🟪 DecorScene showSourceObject changed:', showSourceObject)
        console.log('🟪 Global editor objects available:', !!window.__EDITOR_ALL_OBJECTS__, window.__EDITOR_ALL_OBJECTS__?.length || 0)
    }, [showSourceObject])
    const [hoveredId, setHoveredId] = React.useState(null)
    const [hoverPreview, setHoverPreview] = React.useState(null)
    const [feltSurfaceHover, setFeltSurfaceHover] = React.useState(null)
    const feltTargetsRef = React.useRef()
    const { nextLayersPoints, nodes, ui, scaffoldCenter } = useNodeStore()
    const { gl, camera, scene } = useThree()
    
    // Get the source object for yarn orbital calculations
    const sourceObject = React.useMemo(() => {
        // First try to get from global editor objects
        if (window.__EDITOR_ALL_OBJECTS__ && window.__EDITOR_ALL_OBJECTS__.length > 0) {
            const editorObj = window.__EDITOR_ALL_OBJECTS__[0] // Use first object for now
            console.log('🟡 Using source object from editor:', editorObj.object)
            return editorObj.object
        }
        
        // Fallback to selectedObject from scene store
        if (selectedObject) {
            console.log('🟡 Using source object from scene store:', selectedObject)
            return selectedObject
        }
        
        console.log('🟡 No source object found - yarn will use fallback logic')
        return null
    }, [selectedObject])

    // Debug: eyes state each render
    try { console.log('Eyes in store:', eyes) } catch (_) { }

    // === AxisDir logic (unchanged) ===
    const { axisDir, axisOrigin, axisLen } = React.useMemo(() => {
        let dir = new THREE.Vector3(0, 1, 0)
        let origin = new THREE.Vector3(0, 0, 0)
        let len = 1
        try {
            const selId = selectedObject?.id
            let poles = (useLayerlineStore.getState()?.generated?.markers?.poles || []).map((e) => Array.isArray(e) ? { p: e } : e)
            if (selId != null) poles = poles.filter((p) => (p?.objectId ?? null) === selId)
            const startP = poles.find((e) => e?.role === 'start')?.p || poles[0]?.p
            const endP = poles.find((e) => e?.role === 'end')?.p || poles[1]?.p
            if (startP && endP) {
                const a = new THREE.Vector3(startP[0], startP[1], startP[2])
                const b = new THREE.Vector3(endP[0], endP[1], endP[2])
                const delta = b.clone().sub(a)
                len = Math.max(1e-6, delta.length())
                dir = delta.normalize()
                if (dir.lengthSq() <= 1e-12) dir.set(0, 1, 0)
                origin = a
            }
        } catch (_) { }
        return { axisDir: dir, axisOrigin: origin, axisLen: len }
    }, [selectedObject?.id])

    // === GridPoints list (unchanged) ===
    const allRings = useMemo(() => {
        const objId = selectedObject?.id
        const rings = []
        if (nodes?.nodes?.length > 0) rings.push({ nodes: nodes.nodes, y: nodes?.meta?.y ?? 0 })
        const nxt = Array.isArray(nextLayersPoints) ? nextLayersPoints : []
        for (const r of nxt) {
            if (objId == null || r.objectId === objId) rings.push(r)
        }
        return rings
    }, [nextLayersPoints, nodes, selectedObject?.id])

    const centerApprox = useMemo(() => {
        if (Array.isArray(scaffoldCenter) && scaffoldCenter.length === 3) return scaffoldCenter
        try {
            let sx = 0, sy = 0, sz = 0, count = 0
            for (const r of (allRings || [])) {
                const nodes = r?.nodes || []
                for (const n of nodes) {
                    const p = n?.p || n
                    if (Array.isArray(p) && p.length === 3) { sx += p[0]; sy += p[1]; sz += p[2]; count++ }
                }
            }
            if (count > 0) return [sx / count, sy / count, sz / count]
        } catch (_) { }
        return [0, 0, 0]
    }, [scaffoldCenter, allRings])

    // === 🟢 Updated handleGridActivate ===
    const handleGridActivate = useCallback((id, p, n, ringTangent, quaternion, gridPointSourceObject = null) => {
        console.log('🔴 GRID CLICK DETECTED!')
        console.log('Point ID:', id)
        console.log('Position:', p)
        console.log('Tool:', tool)
        
        try { 
            const decorState = useDecorStore.getState()
            const isUsed = decorState?.hasUsedPoint?.(id)
            const allUsedPoints = decorState?.usedPoints
            console.log('Point already used?', isUsed)
            console.log('All used points:', allUsedPoints)
            console.log('Used points size:', allUsedPoints?.size)
            if (isUsed) {
                console.log('❌ Point already used, returning early')
                return
            }
        } catch (_) { }

        const level = Number(settings?.yarnSizeLevel) || 4;
        const yarnRadius = yarnRadiusFromLevel(level);
        const eyeRadius = yarnRadiusFromLevel(level) * eyeScale;

        if (tool === 'eyes') {
            const normal = Array.isArray(n) ? n : [0, 1, 0];
            const tangent = (ringTangent && Array.isArray(ringTangent)) ? ringTangent : null;
            const quat = Array.isArray(quaternion) ? quaternion : [0, 0, 0, 1]; // fallback identity

            addEyeAt({
                pointId: id,
                position: p,
                normal,
                ringTangent: tangent,
                axisDir: [axisDir.x, axisDir.y, axisDir.z],
                quaternion: Array.isArray(quaternion) ? [...quaternion] : quaternion,   // store orientation directly
                radius: eyeRadius
            });

            // 🟢 Debug
            console.group(`Eye Debug – Layer pointId: ${id}`)
            console.log('Position:', p)
            console.log('Normal:', normal)
            console.log('RingTangent:', tangent)
            console.log('Quaternion:', quat)
            console.groupEnd()

            try {
                useDecorStore.getState()?.addUsedPoint?.(id);
            } catch (_) { }
        } else if (tool === 'yarn') {
            const res = startOrFinishYarnAt({ 
                pointId: id, 
                position: p, 
                radius: yarnRadius,
                sourceObject: gridPointSourceObject || sourceObject  // Use grid point's source object if available
            });
            // Note: Yarn doesn't mark grid points as used - allows endpoints to become start points for branching patterns
        } else if (tool === 'felt') {
            try {
                // Check if there's a pending felt shape to place
                const pendingShape = sessionStorage.getItem('pendingFeltShape')
                const pendingColor = sessionStorage.getItem('pendingFeltColor')
                
                if (pendingShape && pendingColor) {
                    const shape = JSON.parse(pendingShape)
                    console.log('🟢 Placing felt piece:', {
                        pointId: id,
                        position: p,
                        normal: n,
                        shape: shape,
                        color: pendingColor
                    })
                    
                    addFeltPiece({
                        shape: shape,
                        color: pendingColor,
                        position: p,
                        normal: n,
                        scale: 2.0  // Make felt pieces much larger
                    })
                    
                    // Clear the pending felt shape
                    sessionStorage.removeItem('pendingFeltShape')
                    sessionStorage.removeItem('pendingFeltColor')
                    
                    // Mark point as used
                    try {
                        useDecorStore.getState()?.addUsedPoint?.(id);
                    } catch (_) { }
                } else {
                    console.log('🟡 No pending felt shape - open felt modal first')
                }
            } catch (err) {
                console.error('Error placing felt:', err)
            }
        }
    }, [tool, addEyeAt, startOrFinishYarnAt, settings, yarnRadiusFromLevel, eyeScale, axisDir]);

    // Handle surface raycasting for felt placement (when felt tool is active)
    const handleSurfaceHover = useCallback((event) => {
        if (tool !== 'felt') {
            setFeltSurfaceHover(null)
            return
        }

        const pendingShape = sessionStorage.getItem('pendingFeltShape')
        if (!pendingShape) { setFeltSurfaceHover(null); return }

        const targetsGroup = feltTargetsRef.current
        if (!targetsGroup) { setFeltSurfaceHover(null); return }

        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        const rect = gl.domElement.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        mouse.x = x * 2 - 1
        mouse.y = -(y * 2 - 1)

        raycaster.setFromCamera(mouse, camera)

        // Collect only meshes under the felt targets group
        const meshes = []
        targetsGroup.traverse((child) => {
            if (child.isMesh && typeof child.raycast === 'function') meshes.push(child)
        })

        try {
            const hits = raycaster.intersectObjects(meshes, false)
            if (hits && hits.length > 0) {
                const h = hits[0]
                const point = h.point
                const normal = h.face?.normal?.clone?.() || new THREE.Vector3(0,1,0)
                const worldNormal = normal.clone().transformDirection(h.object.matrixWorld)
                setFeltSurfaceHover({ position: point, normal: worldNormal, object: h.object })
            } else {
                setFeltSurfaceHover(null)
            }
        } catch (_e) {
            setFeltSurfaceHover(null)
        }
    }, [tool, camera, gl])

    // Handle surface click for felt placement
    const handleSurfaceClick = useCallback((event) => {
        // Temporarily disabled due to raycast errors
        return
    }, [tool, feltSurfaceHover, addFeltPiece])

    return (
        <group>
            {/* Invisible-but-raycastable clones for felt placement */}
            <FeltRaycastTargets ref={feltTargetsRef} sourceObject={sourceObject} />
            {/* Render ALL editor objects when show source object is enabled */}
            {showSourceObject && <AllEditorObjects visible />}

            {/* Render orbit proxy for debugging */}
            {showOrbitProxy && (() => {
                const C = new THREE.Vector3(...centerApprox)
                let sum = 0, count = 0
                try {
                    for (const r of allRings) {
                        const ns = r?.nodes || []
                        for (const n of ns) {
                            const p = n?.p || n
                            if (Array.isArray(p) && p.length === 3) {
                                const d = new THREE.Vector3(p[0], p[1], p[2]).distanceTo(C)
                                sum += d; count++
                            }
                        }
                    }
                } catch (_) {}
                const baseR = count > 0 ? (sum / count) : 1
                return (
                    <OrbitProxy
                        center={centerApprox}
                        baseRadius={baseR}
                        orbitDistance={dynamicOrbitalDistance}
                        curvatureCompensation={curvatureCompensation}
                        visible
                    />)
            })()}

            {/* Main content - rendered after barrier */}
            <NodeLayers
                ui={ui}
                alwaysShowAllNodes={alwaysShowAllNodes}
                nextLayersPoints={nextLayersPoints}
                nodes={nodes}
                selectedObject={selectedObject}
                generated={generated}
                axisDir={axisDir}
                axisOrigin={axisOrigin}
                axisLen={axisLen}
            />

            {showGridPoints && tool !== 'felt' && (
              <GridPoints
                key={`gridpoints-${tool}`}
                allRings={allRings}
                centerApprox={centerApprox}
                axisDir={axisDir}
                selectedObject={selectedObject}
                sourceMesh={window.__EDITOR_SOURCE_OBJECT__}
                tool={tool}
                showGridPoints={showGridPoints}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
                handleGridActivate={handleGridActivate}
                setHoverPreview={setHoverPreview}
                eyeRadius={yarnRadiusFromLevel(Number(settings?.yarnSizeLevel) || 4) * eyeScale}
              />
            )}

            <EyesList
                eyes={eyes}
                hoverPreview={hoverPreview}
                settings={settings}
                yarnRadiusFromLevel={yarnRadiusFromLevel}
                eyeScale={eyeScale}
                center={centerApprox}
            />

            <YarnList
                yarns={yarns}
                pendingYarnStart={pendingYarnStart}
                hoverPreview={tool === 'yarn' ? hoverPreview : null}
                selectedYarnId={selectedYarnId}
                onSelectYarn={selectYarn}
                onDeleteYarn={removeYarn}
                settings={settings}
                orbitalDistance={dynamicOrbitalDistance}
                center={centerApprox}
                sourceObject={sourceObject}
                proxyRadius={(() => {
                    const C = new THREE.Vector3(...centerApprox)
                    let sum = 0, count = 0
                    try {
                        for (const r of allRings) {
                            const ns = r?.nodes || []
                            for (const n of ns) {
                                const p = n?.p || n
                                if (Array.isArray(p) && p.length === 3) {
                                    const d = new THREE.Vector3(p[0], p[1], p[2]).distanceTo(C)
                                    sum += d; count++
                                }
                            }
                        }
                    } catch (_) {}
                    const avg = count > 0 ? (sum / count) : 1
                    return Math.max(1e-6, avg + yarnOrbitalDistance)
            })()}
            />


            {showOrbitProxy && (() => {
                const C = new THREE.Vector3(...centerApprox)
                let sum = 0, count = 0
                try {
                    for (const r of allRings) {
                        const ns = r?.nodes || []
                        for (const n of ns) {
                            const p = n?.p || n
                            if (Array.isArray(p) && p.length === 3) {
                                const d = new THREE.Vector3(p[0], p[1], p[2]).distanceTo(C)
                                sum += d; count++
                            }
                        }
                    }
                } catch (_) {}
                const baseR = count > 0 ? (sum / count) : 1
                return (
                <OrbitProxy
                    center={centerApprox}
                    baseRadius={baseR}
                    orbitDistance={dynamicOrbitalDistance}
                    curvatureCompensation={curvatureCompensation}
                    visible
                />)
            })()}

            <FeltList
                feltPieces={feltPieces}
                sourceObject={sourceObject}
                orbitalDistance={dynamicOrbitalDistance * 0.3} // Felt sits closer to surface
                selectedFeltId={null} // TODO: Add felt selection
                onSelectFelt={null} // TODO: Add felt selection
                onDeleteFelt={removeFeltPiece}
            />

            {/* Felt placement preview when tool is felt */}
            {tool === 'felt' && (
                <FeltPlacement
                    hoverPreview={feltSurfaceHover}
                    sourceObject={sourceObject}
                    orbitalDistance={dynamicOrbitalDistance * 0.3}
                />
            )}

        </group>
    )
}

export default DecorScene
