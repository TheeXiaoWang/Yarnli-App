# Stitch Type Color Reference

## Quick Visual Guide

This document provides a quick reference for the color-coding system used in CrochetCAD for different stitch types.

## Color Palette

### Primary Testing Colors

```
┌─────────────────────────────────────────────────────────────┐
│  EDGE STITCHES                                              │
│  ████████████████  Yellow (0xffff00)                        │
│  Used for: First and last layers (edge layers)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SINGLE CROCHET (SC)                                        │
│  ████████████████  Blue (0x0000ff)                          │
│  Used for: Standard working stitches in most layers        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CHAIN STITCHES                                             │
│  ████████████████  Purple (0x9467bd)                        │
│  Used for: Turning chains in open/cut layers               │
└─────────────────────────────────────────────────────────────┘
```

### Additional Stitch Types

```
┌─────────────────────────────────────────────────────────────┐
│  HALF DOUBLE CROCHET (HDC)                                  │
│  ████████████████  Green (0x2ca02c)                         │
│  Used for: Half double crochet stitches                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DOUBLE CROCHET (DC)                                        │
│  ████████████████  Red (0xd62728)                           │
│  Used for: Double crochet stitches                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TREBLE CROCHET (TC)                                        │
│  ████████████████  Orange (0xff7f0e)                        │
│  Used for: Treble crochet stitches                         │
└─────────────────────────────────────────────────────────────┘
```

## RGB Values

For reference, here are the RGB equivalents:

| Stitch Type | Hex | RGB | Description |
|-------------|-----|-----|-------------|
| Edge | `0xffff00` | `rgb(255, 255, 0)` | Bright yellow |
| Single Crochet | `0x0000ff` | `rgb(0, 0, 255)` | Pure blue |
| Chain | `0x9467bd` | `rgb(148, 103, 189)` | Medium purple |
| Half Double | `0x2ca02c` | `rgb(44, 160, 44)` | Green |
| Double Crochet | `0xd62728` | `rgb(214, 39, 40)` | Red |
| Treble Crochet | `0xff7f0e` | `rgb(255, 127, 14)` | Orange |

## What You Should See

### Edge Layer
```
Yellow Yellow Yellow Yellow Yellow
   ●      ●      ●      ●      ●
   └──────┴──────┴──────┴──────┘
  Edge   Edge   Edge   Edge   Edge
```
All nodes are **yellow** (edge stitches).

### Closed Loop Layer
```
     Blue  Blue  Blue
      ●     ●     ●
     /             \
Blue●               ●Blue
    |               |
Blue●               ●Blue
     \             /
      ●     ●     ●
     Blue  Blue  Blue
```
All nodes are **blue** (single crochet), arranged in a circular pattern.

### Open Loop Layer (Forward)
```
Purple Purple Blue  Blue  Blue  Blue
  ●      ●     ●     ●     ●     ●
  └──────┴─────┴─────┴─────┴─────┘
  Chain  Chain  SC    SC    SC    SC
```
First 2 nodes are **purple** (chain), rest are **blue** (single crochet).

### Open Loop Layer (Reversed - Serpentine)
```
Blue  Blue  Blue  Blue  Purple Purple
  ●     ●     ●     ●      ●      ●
  └─────┴─────┴─────┴──────┴──────┘
  SC    SC    SC    SC    Chain  Chain
```
Last 2 nodes are **purple** (chain), rest are **blue** (single crochet).

## Testing Checklist

When testing the layer strategy system, verify:

- [ ] **Edge layers** appear as **yellow** nodes
- [ ] **Closed loops** appear as **blue** nodes in circular pattern
- [ ] **Open loops (forward)** have **purple** nodes at the start (first 2)
- [ ] **Open loops (reversed)** have **purple** nodes at the end (last 2)
- [ ] **Single crochet** stitches appear as **blue** nodes
- [ ] Colors are distinct and easy to differentiate
- [ ] No unexpected colors appear (all nodes should match a defined stitch type)

## Color Contrast

The colors were chosen for maximum visual distinction:

- **Yellow** (edge) - Bright and warm, stands out against dark backgrounds
- **Blue** (sc) - Cool and common, easy to see in large quantities
- **Purple** (chain) - Distinct from both yellow and blue, easy to spot

This color scheme works well on both light and dark backgrounds and is distinguishable even with color vision deficiencies.

## Browser Console Verification

To verify colors in the browser console:

```javascript
// Check stitch type definitions
import { STITCH_TYPES } from './src/constants/stitchTypes'
console.table(Object.entries(STITCH_TYPES).map(([key, val]) => ({
  type: key,
  name: val.name,
  color: `0x${val.color.toString(16).padStart(6, '0')}`,
  rgb: `rgb(${(val.color >> 16) & 255}, ${(val.color >> 8) & 255}, ${val.color & 255})`
})))
```

Expected output:
```
┌─────────┬────────────────────┬──────────┬─────────────────────┐
│ (index) │ type               │ color    │ rgb                 │
├─────────┼────────────────────┼──────────┼─────────────────────┤
│ 0       │ 'sc'               │ '0x0000ff'│ 'rgb(0, 0, 255)'   │
│ 1       │ 'hdc'              │ '0x2ca02c'│ 'rgb(44, 160, 44)' │
│ 2       │ 'dc'               │ '0xd62728'│ 'rgb(214, 39, 40)' │
│ 3       │ 'tc'               │ '0xff7f0e'│ 'rgb(255, 127, 14)'│
│ 4       │ 'edge'             │ '0xffff00'│ 'rgb(255, 255, 0)' │
│ 5       │ 'chain'            │ '0x9467bd'│ 'rgb(148, 103, 189)'│
└─────────┴────────────────────┴──────────┴─────────────────────┘
```

## Related Documentation

- `docs/STITCH_TYPE_COLORS.md` - Detailed implementation guide
- `docs/LAYER_STRATEGIES.md` - Layer strategy system
- `src/constants/stitchTypes.js` - Color definitions

