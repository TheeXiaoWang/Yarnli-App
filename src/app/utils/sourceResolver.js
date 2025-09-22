import { useLayerlineStore } from '../stores/layerlineStore'
import { useNodeStore } from '../stores/nodeStore'
import { useSceneStore } from '../stores/sceneStore'

function findNearestLayerIndex(layers, targetY) {
  if (!Array.isArray(layers) || layers.length === 0 || targetY == null) return -1
  let bestIdx = 0
  let bestDelta = Math.abs((layers[0]?.y ?? 0) - targetY)
  for (let i = 1; i < layers.length; i++) {
    const ly = layers[i]?.y ?? 0
    const d = Math.abs(ly - targetY)
    if (d < bestDelta) { bestDelta = d; bestIdx = i }
  }
  return bestIdx
}

// Resolve which layer "current nodes" came from, and which object that layer belongs to.
// Works in any scene by reading from stores directly (no component props required).
export function resolveSourceContext() {
  const generated = useLayerlineStore.getState()?.generated
  const nodeState = useNodeStore.getState()
  const sceneState = useSceneStore.getState()

  const layers = Array.isArray(generated?.layers) ? generated.layers : []
  const poles = (generated?.markers?.poles || []).map(e => Array.isArray(e) ? { p: e } : e)

  // 1) Prefer nodes.meta.y as the anchor to find the originating layer
  const nodes = nodeState?.nodes
  let layerIndex = -1
  let objectId = null

  if (nodes?.meta?.y != null && layers.length > 0) {
    layerIndex = findNearestLayerIndex(layers, nodes.meta.y)
    objectId = layers[layerIndex]?.objectId ?? null
  }

  // 2) Fallback to nextLayersPoints selection
  if (objectId == null) {
    const next = nodeState?.nextLayersPoints
    if (Array.isArray(next) && next.length > 0) {
      // Choose the first visible next layer
      objectId = next[0]?.objectId ?? null
      if (layers.length > 0 && next[0]?.y != null) {
        layerIndex = findNearestLayerIndex(layers, next[0].y)
      }
    }
  }

  // 3) Fallback to markers poles
  if (objectId == null && poles.length > 0) {
    objectId = poles[0]?.objectId ?? null
  }

  // 4) Resolve object from scene store
  const object = sceneState?.objects?.find(o => o.id === objectId) || null

  return { objectId, layerIndex, object }
}

export function getLayerInfo(layerIndex) {
  const layers = useLayerlineStore.getState()?.generated?.layers || []
  if (layerIndex == null || layerIndex < 0 || layerIndex >= layers.length) return null
  const layer = layers[layerIndex]
  return { y: layer?.y ?? 0, objectId: layer?.objectId ?? null, layer }
}


