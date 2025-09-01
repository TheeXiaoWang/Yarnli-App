export { planScaffoldChain } from './planScaffoldChain'
export { planScaffoldChainV2 } from './planScaffoldChainV2'
export { buildScaffoldStep } from './buildStep'
export { mapConsecutiveBuckets } from './mapConsecutive'
export { buildScaffoldSegments } from './buildScaffoldSegments'
export { mapBuckets } from './mapBuckets'
export * from './helpers'

// Centralized re-exports for scaffolding primitives used by the pipeline
export { countNextStitches, distributeNextNodes } from '../../nodes/transitions'
export { buildStepV3 } from './buildStepV3'



