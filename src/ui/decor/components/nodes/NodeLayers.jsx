import React from 'react'
import NodeViewer from '../../../editor/NodeViewer'

const NodeLayers = ({ 
    ui, 
    alwaysShowAllNodes, 
    nextLayersPoints, 
    nodes, 
    selectedObject, 
    generated, 
    axisDir, 
    axisOrigin, 
    axisLen 
}) => {
    if (!(ui?.showNodes || ui?.showNodePoints || alwaysShowAllNodes)) return null

    const vis = alwaysShowAllNodes ? (nextLayersPoints?.length || 0) : Math.max(0, ui?.nodeLayerVisibleCount || 0)
    const out = []

    // Debug logging to identify which layer is visible
    console.log('[NodeLayers] Rendering decision:', {
        'nodeLayerVisibleCount': ui?.nodeLayerVisibleCount,
        'vis': vis,
        'magicRingNodeCount': nodes?.nodes?.length,
        'nextLayersCount': nextLayersPoints?.length,
        'willShowMagicRing': vis === 0,
        'willShowLayer1+': vis > 0,
    })

    if (nodes && Array.isArray(nodes.nodes)) {
        if (!alwaysShowAllNodes && vis === 0) {
            const cap = Math.min(Math.max(1, ui?.nodeVisibleCount || 1), nodes.nodes.length)
            const sliced = { ...nodes, nodes: nodes.nodes.slice(0, cap) }
            out.push(
                <NodeViewer 
                    key={'mr'} 
                    nodeRing0={sliced} 
                    scaffold={{ segments: [] }} 
                    color={'#ffaa00'} 
                    showNodes={true} 
                    showScaffold={false} 
                    showConnections={false} 
                    showPoints={ui?.showNodePoints} 
                />
            )
        } else {
            out.push(
                <NodeViewer 
                    key={'mr'} 
                    nodeRing0={nodes} 
                    scaffold={{ segments: [] }} 
                    color={'#ffaa00'} 
                    showNodes={true} 
                    showScaffold={false} 
                    showConnections={false} 
                    showPoints={ui?.showNodePoints} 
                />
            )
        }
    }
    
    const selId = selectedObject?.id
    const pointsFiltered = Array.isArray(nextLayersPoints)
        ? (selId != null ? nextLayersPoints.filter((e) => e.objectId === selId) : nextLayersPoints)
        : []
        
    if (vis > 0 && pointsFiltered.length > 0) {
        const upto = alwaysShowAllNodes ? pointsFiltered.length : Math.min(vis, pointsFiltered.length)
        const findLayerPolylineByY = (yTarget) => {
            try {
                const layers = Array.isArray(generated?.layers) ? generated.layers : []
                if (layers.length === 0) return null
                let best = null
                let bestD = Infinity
                for (const L of layers) {
                    const d = Math.abs((L?.y ?? 0) - yTarget)
                    if (d < bestD) { best = L; bestD = d }
                }
                const poly = best?.polylines?.[0]
                return Array.isArray(poly) && poly.length > 1 ? poly : null
            } catch (_) { return null }
        }

        for (let i = 0; i < upto; i++) {
            const ring = pointsFiltered[i]
            if (!ring || !Array.isArray(ring.nodes) || ring.nodes.length === 0) continue
            const cap = (!alwaysShowAllNodes && (i === upto - 1)) ? Math.min(Math.max(1, ui?.nodeVisibleCount || 1), ring.nodes.length) : ring.nodes.length
            const nodesCapped = ring.nodes.slice(0, cap)
            const polyline = findLayerPolylineByY(ring.y)
            out.push(
                <NodeViewer
                    key={`nx-ring-${i}`}
                    nodeRing0={{
                        nodes: nodesCapped.map((n) => ({
                            id: n.id,
                            p: n.p,
                            tangent: n.tangent,
                            normal: n.normal,
                            theta: n.theta,
                            quaternion: n.quaternion,
                            stitchType: n.stitchType,
                            stitchProfile: n.stitchProfile
                        })),
                        meta: {
                            center: null,
                            surfaceCenter: null,
                            normal: [axisDir.x, axisDir.y, axisDir.z],
                            axisDir: [axisDir.x, axisDir.y, axisDir.z],
                            axisOrigin: [axisOrigin.x, axisOrigin.y, axisOrigin.z],
                            axisLen,
                            layerPolyline: polyline,
                            objectType: selectedObject?.type || null
                        }
                    }}
                    scaffold={{ segments: [] }}
                    color={'#00aaff'}
                    showNodes={true}
                    showScaffold={false}
                    showPoints={ui?.showNodePoints}
                    objectType={selectedObject?.type || null}
                />
            )
        }
    }
    
    return out.length > 0 ? <group>{out}</group> : null
}

export default NodeLayers
