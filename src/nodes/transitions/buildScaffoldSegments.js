import * as THREE from 'three'

/**
 * Build scaffolding segments connecting current nodes to next nodes based on plan.
 * Inputs:
 * - currentNodes: [{ p:[x,y,z] }]
 * - nextNodes: [{ p:[x,y,z] }]
 * - plan: Array<'inc'|'sc'|'dec'> length === currentNodes.length
 * Behavior:
 * - sc: connect current j → next k (monotonic mapping)
 * - inc: connect current j → next k and k+1
 * - dec: skip mapping at j (merged into neighbor)
 */
export function buildScaffoldSegments({ currentNodes, nextNodes, plan }) {
  const A = currentNodes || []
  const B = nextNodes || []
  const P = plan || new Array(A.length).fill('sc')
  const N = A.length
  const M = B.length
  const segments = []
  if (N === 0 || M === 0) return segments
  // Monotonic pointer mapping
  let k = 0
  for (let j = 0; j < N; j++) {
    const a = A[j]?.p
    if (!a) continue
    const action = P[j] || 'sc'
    if (action === 'inc') {
      // Always split: j -> k and j -> k+1 (wrap-safe)
      const k1 = k % M
      const k2 = (k + 1) % M
      segments.push([a, B[k1].p])
      segments.push([a, B[k2].p])
      k = (k + 2) % M
    } else if (action === 'dec') {
      // Merge: connect to current k, but advance k only when needed by neighbors
      const k1 = k % M
      segments.push([a, B[k1].p])
      // keep k as-is to allow next current stitch to hit the same next node
    } else {
      const k1 = k % M
      segments.push([a, B[k1].p])
      k = (k + 1) % M
    }
  }
  return segments
}


