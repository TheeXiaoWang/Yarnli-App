/**
 * Pattern Generation Service
 * 
 * Unified entry point for complete pattern generation.
 * Orchestrates the two-stage pipeline:
 * 1. Layer Generation (shape-specific)
 * 2. Node Generation (generic, layer-agnostic)
 */

export {
  generateCompletePattern,
  generateLayersOnly,
  generateNodesFromExistingLayers,
  isGenerating,
  getGenerationProgress,
} from './generateCompletePattern'

