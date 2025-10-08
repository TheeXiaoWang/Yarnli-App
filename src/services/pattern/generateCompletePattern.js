/**
 * Unified Pattern Generation
 * 
 * Orchestrates the two-stage pipeline:
 * 1. Layer Generation (shape-specific)
 * 2. Node Generation (generic, layer-agnostic)
 * 
 * This provides a single entry point for generating a complete crochet pattern
 * from 3D objects, while maintaining the separation of concerns between
 * shape-specific layer generation and generic node placement.
 */

import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { useNodeStore } from '../../app/stores/nodeStore'
import { useSceneStore } from '../../app/stores/sceneStore'

/**
 * Generate a complete crochet pattern (layers + nodes)
 * 
 * @param {Object} options - Generation options
 * @param {Array} options.objects - 3D objects to generate pattern from
 * @param {Object} options.settings - Pattern generation settings
 * @param {string} options.handedness - 'left' or 'right' (default: 'right')
 * @param {Function} options.onLayersComplete - Callback after layers are generated
 * @param {Function} options.onNodesComplete - Callback after nodes are generated
 * @param {Function} options.onError - Error callback
 * 
 * @returns {Promise<Object>} - { layers, nodes, success }
 */
export async function generateCompletePattern({
  objects = null,
  settings = null,
  handedness = 'right',
  onLayersComplete = null,
  onNodesComplete = null,
  onError = null,
} = {}) {
  try {
    // Get store instances
    const layerlineStore = useLayerlineStore.getState()
    const nodeStore = useNodeStore.getState()
    const sceneStore = useSceneStore.getState()

    // Use provided objects/settings or fall back to store state
    const targetObjects = objects || sceneStore.objects
    const targetSettings = settings || layerlineStore.settings

    if (!targetObjects || targetObjects.length === 0) {
      throw new Error('No objects provided for pattern generation')
    }

    console.log('[Pattern] Starting complete pattern generation...')

    // ========================================
    // STAGE 1: Generate Layers (Shape-Specific)
    // ========================================
    console.log('[Pattern] Stage 1: Generating layers...')

    await layerlineStore.generate(targetObjects, targetSettings)
    const layerResult = layerlineStore.generated

    if (!layerResult || !layerResult.layers || layerResult.layers.length === 0) {
      throw new Error('Layer generation failed or produced no layers')
    }

    console.log(`[Pattern] Stage 1 complete: ${layerResult.layers.length} layers generated`)
    
    if (onLayersComplete) {
      onLayersComplete(layerResult)
    }

    // ========================================
    // STAGE 2: Generate Nodes (Generic)
    // ========================================
    console.log('[Pattern] Stage 2: Generating nodes from layers...')
    
    await nodeStore.generateNodesFromLayerlines({
      generated: layerResult,
      settings: targetSettings,
      handedness,
    })

    const nodeResult = nodeStore.nodes

    console.log('[Pattern] Stage 2 complete: Nodes generated')
    
    if (onNodesComplete) {
      onNodesComplete(nodeResult)
    }

    // ========================================
    // SUCCESS
    // ========================================
    console.log('[Pattern] Complete pattern generation successful!')

    return {
      success: true,
      layers: layerResult,
      nodes: nodeResult,
      metadata: {
        layerCount: layerResult.layers.length,
        nodeCount: nodeResult?.nodes?.length || 0,
        shapes: targetObjects.map(obj => obj.type),
        timestamp: Date.now(),
      }
    }

  } catch (error) {
    console.error('[Pattern] Pattern generation failed:', error)
    
    if (onError) {
      onError(error)
    }

    return {
      success: false,
      error: error.message,
      layers: null,
      nodes: null,
    }
  }
}

/**
 * Generate only layers (Stage 1)
 * Useful when you want to preview layers before generating nodes
 */
export async function generateLayersOnly({ objects, settings } = {}) {
  const layerlineStore = useLayerlineStore.getState()
  const sceneStore = useSceneStore.getState()

  const targetObjects = objects || sceneStore.objects
  const targetSettings = settings || layerlineStore.settings

  await layerlineStore.generate(targetObjects, targetSettings)
  return layerlineStore.generated
}

/**
 * Generate nodes from existing layers (Stage 2)
 * Useful when you want to regenerate nodes with different settings
 * without regenerating layers
 */
export async function generateNodesFromExistingLayers({ settings, handedness = 'right' } = {}) {
  const layerlineStore = useLayerlineStore.getState()
  const nodeStore = useNodeStore.getState()
  
  const layerResult = layerlineStore.generated

  if (!layerResult || !layerResult.layers || layerResult.layers.length === 0) {
    throw new Error('No layers available. Generate layers first.')
  }

  await nodeStore.generateNodesFromLayerlines({
    generated: layerResult,
    settings: settings || layerlineStore.settings,
    handedness,
  })

  return nodeStore.nodes
}

/**
 * Check if pattern generation is currently in progress
 */
export function isGenerating() {
  const layerlineStore = useLayerlineStore.getState()
  const nodeStore = useNodeStore.getState()
  
  return layerlineStore.isGenerating || nodeStore.isGenerating
}

/**
 * Get current generation progress
 */
export function getGenerationProgress() {
  const layerlineStore = useLayerlineStore.getState()
  const nodeStore = useNodeStore.getState()
  
  if (layerlineStore.isGenerating) {
    return { stage: 'layers', progress: 0.5 }
  }
  
  if (nodeStore.isGenerating) {
    return { stage: 'nodes', progress: 0.75 }
  }
  
  return { stage: 'complete', progress: 1.0 }
}

