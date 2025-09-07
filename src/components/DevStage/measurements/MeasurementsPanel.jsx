import React from 'react'
import { computeStitchDimensions } from '../../../layerlines/stitches'

export default function MeasurementsPanel({ segments, filterIndex = null, onHover }) {
  // Group by object
  const byObject = new Map()
  for (const s of segments) {
    if (!byObject.has(s.objectId)) byObject.set(s.objectId, [])
    byObject.get(s.objectId).push(s)
  }
  const entries = Array.from(byObject.entries())
  const maxVal = Math.max(...segments.map(s => s.value)) || 1
  const { height: stitchH } = computeStitchDimensions({ sizeLevel: 4 })

  return (
    <div className="measure-ruler-panel" style={{ background: 'rgba(0,0,0,0.55)', padding: 8, borderRadius: 10, color: '#fff', width: 260, pointerEvents: 'auto' }}>
      {entries.map(([id, arr]) => (
        <div key={`ruler-${id}`} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Object {id}</div>
          {arr.map((s, i) => {
            const active = filterIndex == null || i === filterIndex
            return (
              <div key={`bar-${id}-${i}`} onMouseEnter={() => onHover?.(s)} onMouseLeave={() => onHover?.(null)} style={{ display: active ? 'grid' : 'none', gridTemplateColumns: '60px 1fr 50px', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#ddd', textAlign: 'left' }}>{s.label}</div>
                <div style={{ height: 4, width: `${(s.value / maxVal) * 180}px`, background: Math.abs(s.value - stitchH) < (stitchH * 0.25) ? '#44dd88' : '#ff7777', borderRadius: 2 }} />
                <div style={{ fontSize: 12, textAlign: 'right' }}>{s.value < 0.05 ? '' : s.value.toFixed(2)}</div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}



