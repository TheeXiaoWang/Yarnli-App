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
    const startK = k
    if (action === 'inc' && k < M - 1) {
      // map to two targets
      segments.push([a, B[k].p])
      segments.push([a, B[k + 1].p])
      k = Math.min(M - 1, k + 2)
    } else if (action === 'dec') {
      // no explicit segment; merged by neighbors; advance k only when needed
      // keep k unchanged
    } else {
      // single
      segments.push([a, B[k].p])
      k = Math.min(M - 1, k + 1)
    }
    if (k < startK) k = startK
  }
  return segments
}


