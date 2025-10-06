# Debugging Node Orientation

## Quick Start

To enable debug logging for node orientation, the system automatically sets debug flags when nodes are created. Check your browser console for detailed logs.

## Debug Logs to Look For

### 1. Quaternion Calculation (buildNodeQuaternion)

```
[buildNodeQuaternion] Node 0: {
  position: [x, y, z],
  center: [cx, cy, cz],
  tangent: [tx, ty, tz],
  normal: [nx, ny, nz],
  tiltRad: 0.123,
  quaternion: [qx, qy, qz, qw]
}
```

**What to check:**
- **Normal vectors should vary** between nodes at different positions
- For a sphere, normals should point radially outward from sphere center
- Tangent vectors should follow the circular path of the layer
- Quaternion values should be different for each node

### 2. Node Creation (buildNodes)

```
[buildNodes] Node 0 created: {
  id: 0,
  position: [x, y, z],
  quaternion: [qx, qy, qz, qw],
  stitchType: 'sc'
}
```

**What to check:**
- All nodes should have quaternion arrays
- Quaternion values should vary between nodes
- Stitch types should be assigned correctly

### 3. Strategy Application (planScaffoldChain)

```
[planScaffoldChain] After applyStrategy: {
  layerIndex: 5,
  nodeCount: 24,
  firstNodeHasQuaternion: true,
  firstNodeQuaternion: [qx, qy, qz, qw],
  firstNodeStitchType: 'sc'
}
```

**What to check:**
- `firstNodeHasQuaternion` should be **true**
- `firstNodeQuaternion` should have valid values (not undefined)
- If false, the strategy is discarding quaternion data (BUG!)

### 4. Spacing Adjustment (planScaffoldChain)

```
[planScaffoldChain] After adjustNodeSpacing: {
  layerIndex: 5,
  nodeCount: 24,
  firstNodeHasQuaternion: true,
  firstNodeQuaternion: [qx, qy, qz, qw]
}
```

**What to check:**
- Quaternion data should still be present after spacing adjustment
- If `firstNodeHasQuaternion` is false, spacing adjustment is discarding data (BUG!)

### 5. NodeViewer Reception

```
[NodeViewer] Received nodes: {
  totalNodes: 24,
  nodesWithQuaternion: 24,
  firstNodeQuaternion: [qx, qy, qz, qw],
  lastNodeQuaternion: [qx2, qy2, qz2, qw2],
  ringMeta: {...}
}
```

**What to check:**
- `nodesWithQuaternion` should equal `totalNodes`
- If less, some nodes are missing quaternion data
- First and last quaternions should be different (unless it's a tiny ring)

### 6. Quaternion Application

```
[NodeViewer] Applied quaternion to node 0: {
  quaternion: [qx, qy, qz, qw],
  theta: 0.123,
  position: [x, y, z]
}
```

**What to check:**
- This log should appear for nodes 0, 1, 2
- If you see "Applied FALLBACK quaternion", the node didn't have baked quaternion data
- If you see "Node X has NO quaternion or tangent/normal data!", the node is missing all orientation data (BUG!)

## Visual Debugging

### Enable Axes Helper

To visualize node orientation, enable the axes helper on node 0:

```javascript
// In browser console:
const { useNodeStore } = await import('./src/app/stores/nodeStore.js')
useNodeStore.setState({ ui: { showAxesHelper: true } })
```

**Expected axes:**
- **Red (X)**: Points along tangent (tip-to-tip direction)
- **Green (Y)**: Points along binormal (perpendicular to surface)
- **Blue (Z)**: Points outward from surface (normal)

**What to look for:**
- Blue axis should point radially outward from the object's center
- Red axis should follow the circular path of the layer
- Green axis should be perpendicular to both

### Enable Node Point Markers

To see raw node positions:

```javascript
const { useNodeStore } = await import('./src/app/stores/nodeStore.js')
useNodeStore.setState({ ui: { showNodePoints: true } })
```

**What to look for:**
- Small cyan spheres at each node position
- Node 0 is marked in red
- Positions should follow the object's surface

### Enable Node Index Labels

To see node IDs:

```javascript
const { useNodeStore } = await import('./src/app/stores/nodeStore.js')
useNodeStore.setState({ ui: { showNodeIndices: true } })
```

## Common Issues

### Issue: All nodes have the same orientation

**Symptoms:**
- All nodes point in the same direction
- No visible rotation variation
- Axes helper shows same orientation for all nodes

**Possible causes:**
1. **Normal calculation using ring center instead of sphere center**
   - Check `buildNodeQuaternion` logs
   - Normal vectors should vary between nodes
   - Fix: Use `sphereCenterV` instead of `ringCenterV`

2. **Quaternion data being discarded**
   - Check `planScaffoldChain` logs after strategy
   - `firstNodeHasQuaternion` should be true
   - Fix: Pass full node objects to strategies, not just positions

### Issue: Some nodes have orientation, others don't

**Symptoms:**
- `nodesWithQuaternion` < `totalNodes` in NodeViewer logs
- Some nodes use fallback quaternion calculation
- Inconsistent orientation across the layer

**Possible causes:**
1. **Strategy creating new nodes without preserving quaternion**
   - Check strategy logs
   - Ensure spread operator is used: `{...nodeOrPos, id: i, stitchType}`

2. **Spacing adjustment discarding quaternion data**
   - Check spacing adjustment logs
   - Ensure spread operator is used: `{...node, p: [x, y, z]}`

### Issue: Nodes have quaternions but still don't rotate

**Symptoms:**
- NodeViewer logs show quaternions are present
- "Applied quaternion to node X" logs appear
- But nodes still look the same

**Possible causes:**
1. **Quaternion values are all identical**
   - Check quaternion values in logs
   - Should vary between nodes
   - If all the same, check normal calculation

2. **Three.js not applying quaternions**
   - Check if `ref.current` is valid
   - Check if `useLayoutEffect` is running
   - Try forcing a re-render

3. **Node scale hiding rotation**
   - If nodes are perfect spheres, rotation is invisible
   - Enable axes helper to visualize orientation
   - Or use ellipsoid geometry for testing

## Testing Checklist

### Basic Functionality

- [ ] Build succeeds without errors
- [ ] Console shows quaternion calculation logs
- [ ] Console shows strategy preservation logs
- [ ] Console shows NodeViewer reception logs
- [ ] No "FALLBACK quaternion" warnings
- [ ] No "NO quaternion" warnings

### Visual Verification

- [ ] Enable axes helper on node 0
- [ ] Blue axis points outward from object center
- [ ] Red axis follows layer path
- [ ] Green axis is perpendicular to both
- [ ] Axes orientation varies across different nodes

### Sphere Test

- [ ] Create a sphere object
- [ ] Nodes at top tilt upward
- [ ] Nodes at equator point horizontally
- [ ] Nodes at bottom tilt downward
- [ ] Smooth rotation transition from top to bottom

### Cylinder Test

- [ ] Create a cylinder object
- [ ] Body nodes point radially outward
- [ ] Cap nodes point up/down
- [ ] Smooth transition at body-cap junction

### Open Layer Test

- [ ] Create an object with open layers
- [ ] Chain stitches have proper orientation
- [ ] Serpentine reversal preserves orientation
- [ ] Spacing adjustment preserves quaternions

## Performance Monitoring

### Check for Excessive Logging

Debug logs are only enabled for the first layer and first 3 nodes to avoid performance issues. If you see excessive logging:

1. Check if `window.__DEBUG_NODE_ORIENTATION` is being reset properly
2. Verify logs are limited to first 3 nodes
3. Consider disabling debug logs in production builds

### Memory Usage

Quaternion data adds 4 numbers per node. For a typical object with 500 nodes:
- Memory overhead: ~8 KB (negligible)
- No performance impact on rendering

## Disabling Debug Logs

To disable debug logging, set the flag to false:

```javascript
window.__DEBUG_NODE_ORIENTATION = false
```

Or rebuild without the debug logging code (remove the debug blocks from the source files).

