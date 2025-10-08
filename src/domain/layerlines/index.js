// Generators index – thin re-exports to keep current impls intact
// This file provides a stable place to import shape generators from.

export { generateSphereLayers } from '../shapes/sphere/layers'
export { generateConeLayers } from '../shapes/cone/layers'
// TODO: Restore triangle/layers.js - temporarily commented out during restructuring
// export { generateTriangleLayers } from '../shapes/triangle/layers'
export { generateCylinderLayers } from '../shapes/cylinder/layers'
export { generateCapsuleLayers } from '../shapes/capsule/layers'
export { generatePyramidLayers } from '../shapes/pyramid/layers'
export { generateTorusLayers } from '../shapes/torus/layers'

