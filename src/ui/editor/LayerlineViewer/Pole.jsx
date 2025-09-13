import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

const Pole = ({ position, upDir, color = '#ffdd55', size = 0.1 }) => {
  const { axisPos, axisNeg, arms } = useMemo(() => {
    const p = new THREE.Vector3(...position)
    const up = (upDir && typeof upDir[0] === 'number') ? new THREE.Vector3(...upDir).normalize() : new THREE.Vector3(0,1,0)
    let u = new THREE.Vector3(1,0,0)
    if (Math.abs(u.dot(up)) > 0.9) u.set(0,1,0)
    u.sub(up.clone().multiplyScalar(u.dot(up))).normalize()
    const v = new THREE.Vector3().crossVectors(up, u)
    return {
      axisPos: p.clone().add(up.clone().multiplyScalar(size*1.5)).toArray(),
      axisNeg: p.clone().add(up.clone().multiplyScalar(-size*1.5)).toArray(),
      arms: [
        [p.clone().sub(u.clone().multiplyScalar(size)).toArray(), p.clone().add(u.clone().multiplyScalar(size)).toArray()],
        [p.clone().sub(v.clone().multiplyScalar(size)).toArray(), p.clone().add(v.clone().multiplyScalar(size)).toArray()],
      ]
    }
  }, [position, upDir, size])
  return (
    <>
      <Line points={[axisNeg, axisPos]} color={color} lineWidth={2} />
      {arms.map((seg, i)=>(<Line key={i} points={seg} color={color} lineWidth={1} />))}
    </>
  )
}

export default Pole


