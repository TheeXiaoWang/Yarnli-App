// Ported to centralized scaffold pipeline
export function buildScaffoldSegments({ currentNodes, nextNodes, plan }) {
  const A = currentNodes || []
  const B = nextNodes || []
  const P = plan || new Array(A.length).fill('sc')
  const N = A.length
  const M = B.length
  const segments = []
  if (N === 0 || M === 0) return segments
  let k = 0
  for (let j = 0; j < N; j++) {
    const a = A[j]?.p
    if (!a) continue
    const action = P[j] || 'sc'
    if (action === 'inc') {
      const k1 = k % M
      const k2 = (k + 1) % M
      segments.push([a, B[k1].p])
      segments.push([a, B[k2].p])
      k = (k + 2) % M
    } else if (action === 'dec') {
      const k1 = k % M
      segments.push([a, B[k1].p])
    } else {
      const k1 = k % M
      segments.push([a, B[k1].p])
      k = (k + 1) % M
    }
  }
  return segments
}


