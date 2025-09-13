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
    widthMul: 1.2,   // was 0.8
    heightMul: 1.0,  // was 0.6
    depthMul: 0.7,   // was 0.5
    color:  0x1f77b4,
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
  inc: {
    widthMul: 1.4, // wider
    heightMul: 1.0,
    depthMul: 0.5,
    color:  0xffd700,
    width: 1.4, height: 1.0, depth: 0.5,
  },
  dec: {
    widthMul: 0.7, // narrower
    heightMul: 1.0,
    depthMul: 0.5,
    color:  0x8b0000,
    width: 0.7, height: 1.0, depth: 0.5,
  },
  slst: {
    widthMul: 0.7,
    heightMul: 0.3,
    depthMul: 0.5,
    color:  0x777777,
    width: 0.7, height: 0.3, depth: 0.5,
  },
  // Magic ring: same baseline as single crochet
  mr: {
    name: "magic ring",
    widthMul: 1,
    heightMul: 0.7,
    depthMul: 0.5,
    color:  0x1f77b4,
    width: 1, height: 0.7, depth: 0.5,
  },
}


