import * as THREE from "three";
import { ringMetricsAlongAxisFromPoints } from "../../domain/nodes/utils/radius";
import { polylineLength3D } from "../../domain/layerlines/circumference";
import { polylineLengthProjected } from "../../domain/layerlines/circumference";
import { buildScaffoldStep } from "./buildStep";
import { resetTiltTrend } from "../nodes/buildNodes";
import { rotateLayerStart } from "../../domain/nodes/utils/rotateLayerStart";
import { STITCH_TYPES } from "../../constants/stitchTypes";
import { DEFAULT_EDGE_GAP_RATIO } from "../nodePlanning/dynamicSpacing";
import { applyStrategy, isClosedLayer } from "../nodePlanning/layerStrategies";
import { adjustNodeSpacingByStitchType } from "../nodePlanning/adjustNodeSpacing";
import { createSphereTiltPipeline } from "../sphereTiltPipeline/sphereTiltPipeline";

export function planScaffoldChain({
  layers,
  startKey,
  centerV,
  axisDir,
  currentNodes,
  distributeNextNodes,
  countNextStitches,
  targetSpacing,
  increaseFactor = 1,
  decreaseFactor = 1,
  incMode = "even",
  decMode = "even",
  spacingMode = "even",
  tiltScale = 1.0,
  idxMap = null,
}) {
  console.log("[ScaffoldPlanner v1] planning", { layers: layers?.length ?? 0 });
  const chainSegments = [];
  const chainByLayer = [];
  const childMaps = [];
  const allNextRings = [];
  let prev = currentNodes.map((n) => ({ p: [...n.p] }));
  const epsKey = 1e-9;
  const n = new THREE.Vector3(axisDir.x, axisDir.y, axisDir.z);
  if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
  n.normalize();
  const axisOrigin = new THREE.Vector3(centerV.x, centerV.y, centerV.z).sub(
    n.clone().multiplyScalar(startKey)
  );
  let lastYProcessed = null;
  let lastRAtYProcessed = null;
  let globalMaxCircumference = 0;

  // Persistent anchor and flip state across layers
  let lastAnchorNode0 = null; // [x,y,z]
  let serpentineFlipState = false;

  // Helper: visible perimeter from cut arcs (sum of open polylines)
  const totalVisibleLength = (layer) => {
    const polys = Array.isArray(layer?.polylines) ? layer.polylines : [];
    if (!polys.length) return 0;
    let sum = 0;
    for (const poly of polys) sum += polylineLength3D(poly, false);
    return sum;
  };

  // Helper function to detect if a layer is a cut layer (open polylines)
  const isCutLayer = (layer) => {
    return Array.isArray(layer?.polylines) && layer.polylines.length > 1;
  };

  // Planner should not generate or mutate layer geometry here.

  // Helper: whether this object's end/start pole is intersected by another object
  const isPoleIntersected = (role) => {
    try {
      const poles = (window?.__LAYERLINE_MARKERS__?.poles || []).map((e) =>
        Array.isArray(e) ? { p: e } : e
      );
      const match = poles.find(
        (p) =>
          p?.objectId === layer?.objectId &&
          p?.role === role &&
          p?.intersected === true
      );
      return !!match;
    } catch (_) {
      return false;
    }
  };

  // Helper function to get stitch type for first/last layers
  const getStitchType = (layer, isFirstLayer, isLastLayer) => {
    const isCut = isCutLayer(layer);
    if ((isFirstLayer || isLastLayer) && !isCut) {
      // If the corresponding pole is intersected by another object, use regular sc instead of edge
      if (isFirstLayer && isPoleIntersected("start")) return "sc";
      if (isLastLayer && isPoleIntersected("end")) return "sc";
      return "edge"; // Use edge stitch type when not intersected
    }
    return "sc"; // Default to single crochet
  };

  // Helper function to calculate actual yarn width based on stitch type
  // NEW: Uses dynamic spacing logic that maintains edge-to-edge gaps
  // This automatically compensates for changes in widthMul
  const getYarnWidthForStitchType = (stitchType, baseYarnWidth) => {
    const stitchProfile = STITCH_TYPES[stitchType] || STITCH_TYPES.sc;
    const widthMul = stitchProfile.widthMul || 1.0;

    // Calculate visual node width
    const visualWidth = baseYarnWidth * widthMul;

    // Calculate edge-to-edge gap (constant, independent of widthMul)
    const edgeGap = baseYarnWidth * DEFAULT_EDGE_GAP_RATIO;

    // CORE FORMULA: Center spacing = edge gap + visual width
    // This ensures edge-to-edge spacing remains constant regardless of widthMul
    const centerSpacing = edgeGap + visualWidth;

    // Apply packing factor for much tighter scaffold placement
    // Lower values = tighter packing (nodes closer together)
    const PF = 0.75;
    return centerSpacing * PF;
  };

  // Rotate nodes so that the entry closest to anchor becomes index 0
  const rotateToNearestAnchor = (nodes, anchor) => {
    if (
      !Array.isArray(nodes) ||
      nodes.length === 0 ||
      !Array.isArray(anchor) ||
      anchor.length !== 3
    )
      return nodes;
    let best = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i].p;
      const dx = p[0] - anchor[0];
      const dy = p[1] - anchor[1];
      const dz = p[2] - anchor[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    if (best === 0) return nodes;
    return rotateLayerStart(nodes, best);
  };

  // Reassign ids to match array order (id 0 becomes first)
  const reassignIdsSequential = (nodes) =>
    nodes.map((e, i) => ({ ...e, id: i }));

  // Pre-scan for global maximum circumference
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    let yTmp = Number(layer.y);
    const polyTmp = layer?.polylines?.[0];
    if (Array.isArray(polyTmp) && polyTmp.length > 0) {
      const mid = polyTmp[Math.floor(polyTmp.length / 2)];
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2]);
        const delta = mv.clone().sub(centerV);
        yTmp = startKey + n.dot(delta);
      }
    }
    const centerAtTmp = axisOrigin.clone().add(n.clone().multiplyScalar(yTmp));
    const projectedCircTmp = Array.isArray(polyTmp)
      ? polylineLengthProjected(
          polyTmp,
          [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z],
          [n.x, n.y, n.z]
        )
      : 0;
    const rTmp =
      projectedCircTmp > 0
        ? projectedCircTmp / (2 * Math.PI)
        : ringMetricsAlongAxisFromPoints(
            polyTmp || [],
            [centerAtTmp.x, centerAtTmp.y, centerAtTmp.z],
            [n.x, n.y, n.z]
          ).radius || 1;
    const L_vis_tmp =
      Array.isArray(layer?.polylines) && layer.polylines.length > 0
        ? layer.polylines.reduce((s, p) => s + polylineLength3D(p, false), 0)
        : 0;
    const circTmp =
      L_vis_tmp > 0 ? L_vis_tmp : 2 * Math.PI * Math.max(1e-9, rTmp);
    if (circTmp > globalMaxCircumference) globalMaxCircumference = circTmp;
  }

  // Use shared overlay order if provided; otherwise fall back to axis/tie-break ordering
  const orderedLayers = (() => {
    if (idxMap && typeof idxMap.get === "function") {
      const ord = (layers || [])
        .filter((l) => idxMap.has(l))
        .sort((a, b) => (idxMap.get(a) ?? 0) - (idxMap.get(b) ?? 0));
      return ord.map((layer, i) => ({ layer, key: i, idx: i, r: 0 }));
    }
    const epsKey = 1e-6;
    const out = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      let yTmp = Number(layer.y);
      const polyTmp = layer?.polylines?.[0];
      if (Array.isArray(polyTmp) && polyTmp.length > 0) {
        const mid = polyTmp[Math.floor(polyTmp.length / 2)];
        if (Array.isArray(mid) && mid.length === 3) {
          const mv = new THREE.Vector3(mid[0], mid[1], mid[2]);
          const delta = mv.clone().sub(centerV);
          yTmp = startKey + n.dot(delta);
        }
      }
      const centerAtTie = new THREE.Vector3(centerV.x, centerV.y, centerV.z)
        .sub(n.clone().multiplyScalar(startKey))
        .add(n.clone().multiplyScalar(yTmp));
      const rTie = Array.isArray(polyTmp)
        ? ringMetricsAlongAxisFromPoints(
            polyTmp,
            [centerAtTie.x, centerAtTie.y, centerAtTie.z],
            [n.x, n.y, n.z]
          ).radius || 0
        : 0;
      out.push({ layer, key: yTmp, idx: i, r: rTie });
    }
    out.sort((a, b) => {
      const dk = a.key - b.key;
      if (Math.abs(dk) <= epsKey) {
        const dr = a.r - b.r;
        if (Math.abs(dr) > 1e-9) return dr;
        return a.idx - b.idx; // preserve input order for true ties
      }
      return dk;
    });
    return out;
  })();

  // Ensure first ring in this planning pass starts with positive tilt sign
  try {
    resetTiltTrend();
  } catch (_) {}

  // Initialize sphere tilt pipeline
  const tiltPipeline = createSphereTiltPipeline({
    orderedLayers,
    sphereCenter: centerV,
    axis: n,
    axisOrigin,
    startKey
  });

  // Track previous layer radius for delta calculation
  let prevRadius = null;

  for (let ringIndex = 0; ringIndex < orderedLayers.length; ringIndex++) {
    const layer = orderedLayers[ringIndex].layer;
    const isFirstLayer = ringIndex === 0;
    const isLastLayer = ringIndex === orderedLayers.length - 1;

    // Use projection along normalized axis for ordering/param
    let yNext = Number(layer.y);
    const poly = layer?.polylines?.[0];
    if (Array.isArray(poly) && poly.length > 0) {
      const mid = poly[Math.floor(poly.length / 2)];
      if (Array.isArray(mid) && mid.length === 3) {
        const mv = new THREE.Vector3(mid[0], mid[1], mid[2]);
        const delta = mv.clone().sub(centerV);
        yNext = startKey + n.dot(delta);
      }
    }
    // Compute center and projected radius for duplicate detection and metrics
    const centerAt = axisOrigin.clone().add(n.clone().multiplyScalar(yNext));
    const projectedCirc = Array.isArray(poly)
      ? polylineLengthProjected(
          poly,
          [centerAt.x, centerAt.y, centerAt.z],
          [n.x, n.y, n.z]
        )
      : 0;
    const rNext =
      projectedCirc > 0
        ? projectedCirc / (2 * Math.PI)
        : ringMetricsAlongAxisFromPoints(
            poly || [],
            [centerAt.x, centerAt.y, centerAt.z],
            [n.x, n.y, n.z]
          ).radius || 1;

    // Skip only exact duplicates at the same param and the same radius.
    // This allows multiple concentric base rings at the start plane to be processed sequentially.
    if (prev.length > 1 && lastYProcessed != null) {
      const sameY = Math.abs(yNext - lastYProcessed) <= epsKey;
      const epsR = Math.max(
        1e-6,
        1e-6 * Math.max(1, rNext, lastRAtYProcessed || 0)
      );
      const sameR =
        lastRAtYProcessed != null &&
        Math.abs(rNext - lastRAtYProcessed) <= epsR;
      if (sameY && sameR) continue;
    }

    // Prefer true visible 3D length for cut layers; fallback to analytic circle when absent
    const L_vis = totalVisibleLength(layer);
    const fullCircle = 2 * Math.PI * Math.max(1e-9, rNext);
    let nextCircumference = L_vis > 0 ? L_vis : fullCircle;

    // Do not override the last layer length; use the visible perimeter if present

    // DEV diagnostics: ensure visible perimeter is being used
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      try {
        if (Array.isArray(layer?.polylines) && layer.polylines.length > 0) {
          const sum = totalVisibleLength(layer);
          if (Math.abs(sum - nextCircumference) > 1e-6) {
            // eslint-disable-next-line no-console
            console.warn("[layer] L_vis mismatch", {
              sum,
              nextCircumference,
              y: yNext,
            });
          }
        }
      } catch (_) {}
    }
    // derive stitch count to forward into distribution
    // Previous ring circumference using its centroid snapped onto axis
    let sx = 0,
      sy = 0,
      sz = 0;
    for (const q of prev) {
      sx += q.p[0];
      sy += q.p[1];
      sz += q.p[2];
    }
    const centroidPrev = new THREE.Vector3(
      sx / Math.max(1, prev.length),
      sy / Math.max(1, prev.length),
      sz / Math.max(1, prev.length)
    );
    const tPrev = n.dot(centroidPrev.clone().sub(axisOrigin));
    const centerPrev = axisOrigin.clone().add(n.clone().multiplyScalar(tPrev));
    const { circumference: curCirc } = ringMetricsAlongAxisFromPoints(
      prev.map((e) => e.p),
      [centerPrev.x, centerPrev.y, centerPrev.z],
      [n.x, n.y, n.z]
    );
    const nextCirc = 2 * Math.PI * rNext;

    // Get stitch type for this layer
    const stitchType = getStitchType(layer, isFirstLayer, isLastLayer);

    // Calculate yarn width based on the actual stitch type that will be used
    const actualYarnWidth = getYarnWidthForStitchType(
      stitchType,
      targetSpacing
    );

    let { nextCount } = countNextStitches({
      currentCount: prev.length,
      currentCircumference: curCirc,
      nextCircumference: nextCircumference,
      yarnWidth: actualYarnWidth, // Use stitch type's actual width for proper spacing
      increaseFactor,
      decreaseFactor,
      spacingMode,
      incMode,
      decMode,
      seed: Math.floor(yNext * 1000),
    });

    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      try {
        if (nextCount <= 3 && nextCircumference > 3 * targetSpacing) {
          // eslint-disable-next-line no-console
          console.warn(
            "[counts] suspiciously low nextCount for available length",
            {
              nextCount,
              nextCircumference,
              yarnWidth: targetSpacing,
              y: yNext,
            }
          );
        }
      } catch (_) {}
    }

    // For open layers, we need to account for chain stitches in the node count
    const isOpen = !isClosedLayer(layer);
    const chainStitchCount = isOpen ? 2 : 0;
    const totalNodeCount = nextCount + chainStitchCount;

    // Get tilt angle from pipeline
    const tiltData = tiltPipeline.getTiltForLayer(ringIndex);
    const rollAngle = tiltData.rollAngle;

    const { segments, nextCurrentNodes, parentToChildren } = buildScaffoldStep({
      currentNodes: prev,
      layer,
      yNext,
      rNext,
      nextCount: totalNodeCount,
      center: [centerAt.x, centerAt.y, centerAt.z],
      sphereCenter: [centerV.x, centerV.y, centerV.z],
      maxCircumference: globalMaxCircumference,
      up: [n.x, n.y, n.z],
      distributeNextNodes,
      aRef: typeof aRef !== "undefined" ? aRef : null,
      yarnWidth: actualYarnWidth, // Use stitch type's actual width for proper distribution
      stitchType: stitchType, // This will handle the visual size difference
      tiltScale: Number(tiltScale) || 1.0,
      // Pass pre-calculated tilt angle from pipeline
      rollAngle: rollAngle,
    });

    // Apply layer-specific strategy for node ordering and stitch type assignment
    // This handles:
    // - Serpentine ordering for consecutive open layers
    // - Chain stitch insertion for open layers
    // - Sequential ordering for closed layers
    const rawNodes = Array.isArray(nextCurrentNodes) ? nextCurrentNodes : [];

    // IMPORTANT: Pass full node objects (not just positions) to preserve quaternion data
    // The strategy functions will preserve all properties (quaternion, theta, tangent, normal, etc.)
    const strategyResult = applyStrategy({
      layer,
      nodePositions: rawNodes, // Pass full node objects, not just positions
      nodeCount: totalNodeCount,
      flipState: serpentineFlipState,
      lastAnchor: lastAnchorNode0,
      stitchType,
    });

    let adjusted = strategyResult.nodes;
    serpentineFlipState = strategyResult.newFlipState;

    // DEBUG: Log quaternion preservation after strategy
    if (
      typeof window !== "undefined" &&
      window.__DEBUG_NODE_ORIENTATION &&
      adjusted.length > 0
    ) {
      console.log("[planScaffoldChain] After applyStrategy:", {
        layerIndex: i,
        nodeCount: adjusted.length,
        firstNodeHasQuaternion: !!adjusted[0]?.quaternion,
        firstNodeQuaternion: adjusted[0]?.quaternion,
        firstNodeStitchType: adjusted[0]?.stitchType,
      });
    }

    // Rotate to nearest anchor if available
    if (lastAnchorNode0) {
      adjusted = rotateToNearestAnchor(adjusted, lastAnchorNode0);
    }
    adjusted = reassignIdsSequential(adjusted);

    // NEW: Adjust node spacing based on stitch types
    // This maintains constant edge-to-edge gaps for nodes with different widths
    // (e.g., chain stitches are narrower than single crochet)
    if (isOpen && adjusted.length > 0) {
      // Use targetSpacing as base yarn width (already passed as parameter)
      // targetSpacing represents the base yarn width derived from yarn size level
      const baseYarnWidth = Math.max(1e-6, Number(targetSpacing) || 0.5);

      // Adjust spacing to account for different stitch type widths
      adjusted = adjustNodeSpacingByStitchType(adjusted, {
        baseYarnWidth: baseYarnWidth,
        edgeGapRatio: DEFAULT_EDGE_GAP_RATIO,
        closed: !isOpen,
        center: [centerAt.x, centerAt.y, centerAt.z],
      });

      // DEBUG: Log quaternion preservation after spacing adjustment
      if (
        typeof window !== "undefined" &&
        window.__DEBUG_NODE_ORIENTATION &&
        adjusted.length > 0
      ) {
        console.log("[planScaffoldChain] After adjustNodeSpacing:", {
          layerIndex: ringIndex,
          nodeCount: adjusted.length,
          firstNodeHasQuaternion: !!adjusted[0]?.quaternion,
          firstNodeQuaternion: adjusted[0]?.quaternion,
        });
      }
    }

    // Collapse near-duplicate micro-layers that produce a single node only if
    // BOTH the axis key AND the radius are essentially identical to the last ring.
    // This preserves concentric base rings on the same plane (same y) that have
    // distinct radii — they must all be processed for proper scaffolding.
    const EPS_COLLAPSE_Y = 1e-3;
    const epsRcollapse = Math.max(
      1e-6,
      1e-6 * Math.max(1, rNext, lastRAtYProcessed || 0)
    );
    const isSameYAsPrev =
      allNextRings.length > 0 &&
      Math.abs(yNext - allNextRings[allNextRings.length - 1].y) <
        EPS_COLLAPSE_Y;
    const isSameRAsPrev =
      lastRAtYProcessed != null &&
      Math.abs(rNext - lastRAtYProcessed) <= epsRcollapse;
    const isDegenerateNearPrev =
      (adjusted?.length || 0) <= 1 && isSameYAsPrev && isSameRAsPrev;
    if (isDegenerateNearPrev) {
      // eslint-disable-next-line no-console
      console.warn("[planScaffoldChain] skipped degenerate layer at y=", yNext);
      continue;
    }

    chainSegments.push(...segments);
    chainByLayer.push({ y: yNext, segments });
    // Guard single-node maps unless they are not near-duplicates
    if ((adjusted?.length || 0) > 1) {
      const mapEntries = parentToChildren.map((arr, j) => ({
        from: j,
        children: arr.slice(),
      }));
      const maybeTypes = (segments && segments.types) || null;
      childMaps.push({
        y: yNext,
        fromCount: prev.length,
        toCount: adjusted.length,
        map: mapEntries,
        types: maybeTypes || undefined,
      });
    }
    prev = adjusted;
    lastYProcessed = yNext;
    lastRAtYProcessed = rNext;
    // Update anchor to this layer's node0
    if (adjusted && adjusted.length > 0)
      lastAnchorNode0 = adjusted[0].p.slice();

    // Populate per-layer node rings for visuals (counts, sliders)
    // Skip empty rings to avoid ghost layers and phantom stitches
    if (adjusted && adjusted.length > 0) {
      allNextRings.push({
        y: yNext,
        nodes: adjusted,
        circumference: nextCircumference,
      });

      // Collect tilt data for comprehensive logging
      // Extract theta (signed roll angle) from first node (all nodes in a ring have the same tilt)
      const firstNode = adjusted[0];
      if (firstNode && typeof firstNode.theta === "number") {
        const thetaRad = firstNode.theta;
        const thetaDeg = THREE.MathUtils.radToDeg(thetaRad);

        // Calculate diagnostic values
        const t = yNext - startKey; // Axial offset from sphere center along axis
        const circumferenceRatio =
          globalMaxCircumference > 0
            ? Number((nextCircumference / globalMaxCircumference).toFixed(4))
            : 0;
        const radiusDelta =
          prevRadius !== null ? Number((rNext - prevRadius).toFixed(4)) : 0;

        // Add tilt data to pipeline for logging
        tiltPipeline.addTiltDataEntry({
          layerIndex: ringIndex,
          y: yNext,
          radius: rNext,
          circumference: nextCircumference,
          circumferenceRatio: circumferenceRatio,
          radiusDelta: radiusDelta,
          t: t,
          thetaRad: thetaRad,
          thetaDeg: thetaDeg,
          nodeCount: adjusted.length,
          stitchType: firstNode.stitchType || "sc"
        });

        // Update previous radius for next iteration
        prevRadius = rNext;
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn("[planScaffoldChain] skipped empty layer at y=", yNext);
    }
  }
  const firstNextNodesRing = allNextRings[0]?.nodes || [];

  // Debug summary of single-node layers after collapse
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const bad = childMaps.filter((m) => m.toCount === 1);
    if (bad.length) {
      // eslint-disable-next-line no-console
      console.log(
        "[warn] single-node layers:",
        bad.map((m) => m.y)
      );
    }
  }

  // Log last layer quaternion info (development mode only)
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    try {
      if (typeof window !== "undefined" && window.__LAST_LAYER_INFO) {
        const lastLayerInfo = window.__LAST_LAYER_INFO;
        const lastLayerNodes = lastLayerInfo.nodes;
        if (lastLayerNodes && lastLayerNodes.length > 0) {
          const firstNode = lastLayerNodes[0];
          // eslint-disable-next-line no-console
          console.log("[buildNodes] LAST LAYER - Node 0 quaternion:", {
            layerIndex: lastLayerInfo.layerIndex,
            y: lastLayerInfo.y,
            position: firstNode.p,
            quaternion: firstNode.quaternion,
            theta: firstNode.theta,
            thetaDeg: THREE.MathUtils.radToDeg(firstNode.theta),
          });
        }

        // Log last layer tangent consistency info
        if (window.__LAST_LAYER_TANGENT_INFO) {
          // eslint-disable-next-line no-console
          console.log(
            "[buildNodeQuaternion] LAST LAYER - Tangent consistency check:",
            window.__LAST_LAYER_TANGENT_INFO
          );
        }

        // Reset counters
        window.__LAYER_COUNTER = 0;
        window.__LAST_LAYER_INFO = null;
        window.__FIRST_LAYER_TANGENT_LOGGED = false;
        window.__LAST_LAYER_TANGENT_INFO = null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[planScaffoldChain] Error logging last layer info:", err);
    }
  }

  // Log comprehensive tilt data using pipeline
  tiltPipeline.logAllTiltData();

  return {
    chainSegments,
    chainByLayer,
    childMaps,
    allNextRings,
    firstNextNodesRing,
  };
}
