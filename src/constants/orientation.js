import * as THREE from 'three'

// Canonical node mesh axes contract:
// X = stitch width (tip-to-tip), Y = stitch height, Z = outward (surface normal)
// If the authored mesh uses different local axes, adjust this quaternion to
// rotate from model space to the canonical convention above.
export const MODEL_TO_CANON_Q = new THREE.Quaternion()
// Example correction (disabled by default):
// MODEL_TO_CANON_Q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))


