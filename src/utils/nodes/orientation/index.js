export { calculateSphereOrientation } from './sphere'
export { calculateConeOrientation } from './cone'
export { calculateDefaultOrientation } from './default'

// Future exports for other shapes:
// export { calculateTriangleOrientation } from './triangle'

/**
 * Get the appropriate orientation calculator for a given object type
 * @param {string} objectType - The type of object ('sphere', 'cone', 'triangle', etc.)
 * @returns {Function} - The orientation calculation function
 */
export function getOrientationCalculator(objectType) {
  switch (objectType) {
    case 'sphere':
      return require('./sphere').calculateSphereOrientation
    case 'cone':
      return require('./cone').calculateConeOrientation
    case 'triangle':
      // return require('./triangle').calculateTriangleOrientation
      return require('./default').calculateDefaultOrientation
    default:
      return require('./default').calculateDefaultOrientation
  }
}
