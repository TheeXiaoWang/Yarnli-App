import React from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

const RingLines = ({ layers, color = '#00ffaa' }) => {
  return (
    <>
      {layers.map((points, idx) => (
        <Line
          key={idx}
          points={points}
          color={color}
          lineWidth={1.25}
          depthTest
          depthWrite={false}
          transparent
          opacity={0.98}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          renderOrder={10}
          closed
        />
      ))}
    </>
  )
}

export default RingLines


