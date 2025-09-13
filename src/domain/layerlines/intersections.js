// Compatibility shim: the intersection feature was fully modularized into
// the ./intersections folder. This file re-exports the public API so older
// imports continue to work. See the files below for the implementation:
// - ./intersections/plan.js        (priority planning)
// - ./intersections/clip.js        (clipping + markers + sliver culling)
// - ./intersections/connectors.js  (optional orange connector helpers)

export { computeIntersectionPlan, approximateTotalVolume } from './intersections/plan'
export { clipLayersAgainstCuttersWithMarkers as clipLayersAgainstCutters } from './intersections/clip'


