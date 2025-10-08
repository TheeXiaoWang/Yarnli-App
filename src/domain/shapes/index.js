// Shape registry - central registry for all crochet shapes
import { generateSphereLayers } from './sphere/layers.js'
import { generateConeLayers } from './cone/layers.js'
import { generateCylinderLayers } from './cylinder/layers.js'
import { generateCapsuleLayers } from './capsule/layers.js'
import { generatePyramidLayers } from './pyramid/layers.js'
import { generateTorusLayers } from './torus/layers.js'

export const SHAPE_REGISTRY = {
  sphere: {
    name: 'Sphere',
    generateLayers: generateSphereLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
    // Shape-specific orientation helpers are in domain/nodes/utils/orientation/
  },
  cone: {
    name: 'Cone',
    generateLayers: generateConeLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
    // Shape-specific orientation helpers are in domain/nodes/utils/orientation/
  },
  // TODO: Restore triangle shape - temporarily commented out during restructuring
  // triangle: {
  //   name: 'Triangle',
  //   generateLayers: generateTriangleLayers,
  //   // Note: Node generation is shape-agnostic and handled by nodePlanning services
  // },
  cylinder: {
    name: 'Cylinder',
    generateLayers: generateCylinderLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
  },
  capsule: {
    name: 'Capsule',
    generateLayers: generateCapsuleLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
  },
  pyramid: {
    name: 'Pyramid',
    generateLayers: generatePyramidLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
  },
  torus: {
    name: 'Torus',
    generateLayers: generateTorusLayers,
    // Note: Node generation is shape-agnostic and handled by nodePlanning services
  }
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
