import React, { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'

export default function MeasurementsOverlay3D({ segments, dots, filterIndex = null }) {
  const dotPoints = useMemo(() => dots || [], [dots])
  // Build fallback edges directly from dots to guarantee dot→next-dot segments end-to-end
  const fallbackSegments = useMemo(() => {
    const out = []
    for (let i = 0; i < dotPoints.length - 1; i++) {
      out.push({ a: dotPoints[i], b: dotPoints[i + 1], value: 0, objectId: 'dots', label: `${i}→${i+1}` })
    }
    return out
  }, [dotPoints])
  const segs = (segments && segments.length > 0) ? segments : fallbackSegments

  return (
    <group>
      {segs.map((s, i) => {
        const active = filterIndex == null || i === filterIndex
        if (!active) return null
        return (
          <React.Fragment key={`seg-${i}`}>
            <Line points={[s.a, s.b]} color={'#ffdd55'} lineWidth={1} transparent opacity={0.75} />
            <Html position={[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2,(s.a[2]+s.b[2])/2]} center style={{ pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 6px', borderRadius: 4, fontSize: 16 }}>
                {s.value < 0.05 ? '' : s.value.toFixed(2)}
              </div>
            </Html>
          </React.Fragment>
        )
      })}
      {dotPoints.map((p, i) => (
        <mesh key={`dot-${i}`} position={p}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={'#ff4444'} />
        </mesh>
      ))}
    </group>
  )
}



