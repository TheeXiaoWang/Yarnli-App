import React from 'react'
import { Line } from '@react-three/drei'

const Ring0Overlay = ({ polylines = [], color = '#00ffaa' }) => {
  return (
    <>
      {polylines.map((ring, i) => (
        <Line
          key={`ring0-${i}`}
          points={ring}
          color={color}
          lineWidth={2}
          depthTest
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      ))}
    </>
  )
}

export default Ring0Overlay


