import * as THREE from 'three'
import { getWorldCenter } from '../common'

// Compute a world-space slice direction for an object, honoring rotation and cutters for uniform spheres.
export function computeSliceDirForObject(obj, cutters) {
  // Default: no explicit dir
  let sliceDir = null
  // For uniform spheres, derive an intuitive direction
  if (obj?.type === 'sphere') {
    const sx = Math.abs(obj.scale?.[0] || 1)
    const sy = Math.abs(obj.scale?.[1] || 1)
    const sz = Math.abs(obj.scale?.[2] || 1)
    const uniform = Math.abs(sx - sy) < 1e-4 && Math.abs(sy - sz) < 1e-4
    if (uniform) {
      if (Array.isArray(cutters) && cutters.length > 0) {
        const cObj = new THREE.Vector3().copy(getWorldCenter(obj))
        const sum = new THREE.Vector3(0, 0, 0)
        for (const c of cutters) {
          const cCtr = getWorldCenter(c)
          sum.add(new THREE.Vector3().subVectors(cObj, cCtr))
        }
        if (sum.length() > 1e-6) {
          sum.normalize()
          sliceDir = [sum.x, sum.y, sum.z]
        }
      }
      if (!sliceDir) {
        // Align with object's up axis in world space to respect rotation
        const worldMat = new THREE.Matrix4()
          .compose(new THREE.Vector3(...obj.position),
                   new THREE.Quaternion().setFromEuler(new THREE.Euler(obj.rotation[0]*Math.PI/180, obj.rotation[1]*Math.PI/180, obj.rotation[2]*Math.PI/180)),
                   new THREE.Vector3(...obj.scale))
        const upWorld = new THREE.Vector3().setFromMatrixColumn(worldMat, 1).normalize()
        sliceDir = [upWorld.x, upWorld.y, upWorld.z]
      }
    }
  }
  return sliceDir
}


