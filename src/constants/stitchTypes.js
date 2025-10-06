// Baseline physical dims (in "stitch units") historically were width=0.5, height=0.5, depth=0.75.
// We keep those for backward compatibility but introduce explicit multipliers that scale
// relative to the yarn gauge so sizes remain proportional when yarn size changes.
export const STITCH_TYPES = {
  sc: {
    name: "single crochet",
    // Multipliers relative to yarn gauge (1.0 = gauge baseline)
    // Updated to better reflect real-world SC bulk: approximately 2× visual volume
    // compared to the previous settings. Width follows the tangent direction,
    // height is vertical, depth is normal to the surface.
    widthMul: 1,   // was 0.8
    heightMul: 1.0,  // was 0.6
    depthMul: 0.7,   // was 0.5
    color:  0x0000ff, // Blue for easy visual identification
    // Legacy fields (not used when *Mul is present)
    width: 2.0, height: 1.2, depth: 1.0,
  },
  hdc: {
    name:   "half double",
    widthMul: 1.0,
    heightMul: 1.3,
    depthMul: 0.5,
    color:  0x2ca02c,
    width: 1.0, height: 1.3, depth: 0.5,
  },
  dc: {
    name:   "double crochet",
    widthMul: 1.0,
    heightMul: 1.6,
    depthMul: 0.5,
    color:  0xd62728,
    width: 1.0, height: 1.6, depth: 0.5,
  },
  tc: {
    name:   "treble crochet",
    widthMul: 1.0,
    heightMul: 2.0,
    depthMul: 0.5,
    color:  0xff7f0e,
    width: 1.0, height: 2.0, depth: 0.5,
  },
  // Edge layer: 0.6x size of single crochet for tighter first and last layers
  edge: {
    name: "edge layer",
    widthMul: 0.7,   // 0.6x of single crochet width
    heightMul: 1,  // 0.6x of single crochet height
    depthMul: 0.6,   // 0.6x of single crochet depth
    color:  0xffff00, // Yellow for easy visual identification
    width: 0.6, height: 0.6, depth: 0.6,
  },
  // Chain stitch: turning chain for open/cut layers
  // Thinner and taller than single crochet
  chain: {
    name: "chain stitch",
    widthMul: 0.5,   // Thinner than sc (chains are narrow)
    heightMul: 1.2,  // Slightly taller than sc
    depthMul: 0.3,   // Very thin depth (chains are flat)
    color:  0x9467bd, // Purple color to distinguish from sc
    width: 0.5, height: 1.2, depth: 0.3,
  },
}


