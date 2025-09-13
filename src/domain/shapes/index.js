// Shape registry - central registry for all crochet shapes
import { generateSphereLayers } from './sphere/layers.js'
import { generateConeLayers } from './cone/layers.js'
import { generateTriangleLayers } from './triangle/layers.js'

export const SHAPE_REGISTRY = {
  sphere: {
    name: 'Sphere',
    generateLayers: generateSphereLayers,
    // TODO: Add nodes.js when moved
  },
  cone: {
    name: 'Cone',
    generateLayers: generateConeLayers,
    // TODO: Add nodes.js when moved
  },
  triangle: {
    name: 'Triangle',
    generateLayers: generateTriangleLayers,
    // TODO: Add nodes.js when moved
  },
  // TODO: Add cylinder when implemented
}

export function getShapeGenerator(shapeType) {
  const shape = SHAPE_REGISTRY[shapeType]
  if (!shape) {
    throw new Error(`Unknown shape type: ${shapeType}`)
  }
  return shape
}

export function listAvailableShapes() {
  return Object.keys(SHAPE_REGISTRY)
}
