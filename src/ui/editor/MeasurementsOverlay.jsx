import React, { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { computeMeasurementSegments } from './measurements/compute'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import MeasurementsPanel from './measurements/MeasurementsPanel'
import MeasurementsOverlay3D from './measurements/MeasurementsOverlay3D'

// Renders measurement lines and labels between successive rings and from pole→first ring
// Props:
// - layers: array of { y, polylines, objectId }
// - markers: { poles: [ [x,y,z] | { p:[x,y,z], objectId }, ... ] }
// - measureEvery: integer step for sampling (default 1)
// - azimuthDeg: angle around axis (0..359) supplied from panel settings
export default function MeasurementsOverlay({ layers, markers, measureEvery = 1, azimuthDeg = 0 }) {
  // Build strict start→end chains per object using per‑object ordering
  const segments = useMemo(
    () => computeMeasurementSegments(layers, markers, measureEvery, {
      projectAlongAxis: false,
      orderedAlready: true,
      includeAllLayers: true,
      addProbeSegment: false,
      azimuthDeg
    }),
    [layers, markers, measureEvery, azimuthDeg]
  )
  // Build small red dots at the actual measurement anchor points on rings
  const dots = useMemo(() => {
    const poles = new Set()
    const poleArr = Array.isArray(markers?.poles) ? markers.poles : []
    for (const entry of poleArr) {
      const p = Array.isArray(entry) ? entry : (entry?.p || entry?.pos)
      if (Array.isArray(p) && p.length === 3) poles.add(p.map(n => +n.toFixed(4)).join('|'))
    }
    const uniq = new Set()
    const out = []
    for (const s of (segments || [])) {
      const pts = [s.a, s.b]
      // Exclude poles; keep ring anchors only
      for (const pt of pts) {
        if (!Array.isArray(pt) || pt.length !== 3) continue
        const key = pt.map(n => +n.toFixed(4)).join('|')
        if (poles.has(key)) continue
        if (!uniq.has(key)) { uniq.add(key); out.push(pt) }
      }
    }
    return out
  }, [segments, markers])
  const [percent, setPercent] = useState(100)
  const cutoff = useMemo(() => Math.round((percent / 100) * segments.length), [percent, segments.length])

  // Render an on-screen ruler comparing per-object distances in order
  const overlay = useMemo(() => {
    return (
      <Html transform={false} fullscreen>
        <div style={{ position: 'fixed', top: 8, right: 8, pointerEvents: 'auto', zIndex: 9999 }}>
          <MeasurementsPanel segments={segments.slice(0, cutoff)} filterIndex={null} />
          <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.55)', padding: 8, borderRadius: 10 }}>
            <div style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>Show %</div>
            <input type="range" min={0} max={100} value={percent} onChange={(e)=>setPercent(parseInt(e.target.value,10))} onMouseDown={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()} style={{ width: 220 }} />
            <div style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>{percent}% ({cutoff}/{segments.length})</div>
          </div>
        </div>
      </Html>
    )
  }, [segments, percent, cutoff])

  return <group><MeasurementsOverlay3D segments={segments.slice(0, cutoff)} dots={dots} filterIndex={null} />{overlay}</group>
}


