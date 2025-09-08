import React, { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { computeMeasurementsV2 } from './measurements/measurementsV2'
import { computeStitchDimensions } from '../../layerlines/stitches'
import MeasurementsPanel from './measurements/MeasurementsPanel'
import MeasurementsOverlay3D from './measurements/MeasurementsOverlay3D'

// Renders measurement lines and labels between successive rings and from pole→first ring
// Props:
// - layers: array of { y, polylines, objectId }
// - markers: { poles: [ [x,y,z] | { p:[x,y,z], objectId }, ... ] }
// - measureEvery: integer step for sampling (default 1)
export default function MeasurementsOverlay({ layers, markers }) {
  const [azimuthDeg, setAzimuthDeg] = useState(0)
  // Show all segments between consecutive dots; no spacing filter here
  const result = useMemo(() => computeMeasurementsV2(layers, markers, { azimuthDeg, projectAlongAxis: false, targetSpacing: null, firstSpacingAtLeast: 0 }), [layers, markers, azimuthDeg])
  const segments = result.segments
  const dots = result.dots
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
            <div style={{ color: '#fff', fontSize: 12, marginTop: 10 }}>Azimuth (° around rings)</div>
            <input type="range" min={0} max={359} value={azimuthDeg} onChange={(e)=>setAzimuthDeg(parseInt(e.target.value,10))} onMouseDown={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()} style={{ width: 220 }} />
            <div style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>{azimuthDeg}°</div>
          </div>
        </div>
      </Html>
    )
  }, [segments, percent, cutoff, azimuthDeg])

  return <group><MeasurementsOverlay3D segments={segments.slice(0, cutoff)} dots={dots} filterIndex={null} />{overlay}</group>
}


