import React from 'react'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import { useSceneStore } from '../../app/stores/sceneStore'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { useNodeStore } from '../../app/stores/nodeStore'

const Row = ({ label, children }) => (
  <div className="property-item">
    <span className="property-label">{label}</span>
    <span className="property-value">{children}</span>
  </div>
)

const Select = ({ value, onChange, children, style }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ width: 140, background: '#2a2a2a', border: '1px solid #505050', color: '#fff', padding: '4px 6px', borderRadius: 4, ...style }}
  >
    {children}
  </select>
)

const LayerlinePanel = () => {
  const { objects } = useSceneStore()
  const { settings, setSettings, generated, isGenerating, generate, exportJSON } = useLayerlineStore()
  const { isGenerating: isGeneratingNodes, generateNodesFromLayerlines, ui, setVisibility, chainScaffoldByLayer } = useNodeStore()

  const handleGenerate = async () => {
    await generate(objects)
  }

  const handleGenerateNodes = async () => {
    await generate(objects) // ensure we have up-to-date layers
    await generateNodesFromLayerlines({ generated, settings })
  }

  return (
    <div className="properties-section">
      <h3>Layerlines</h3>

      <Row label="Yarn Size">
        <Select
          value={settings.yarnSizeLevel ?? 4}
          onChange={(v) => setSettings({ yarnSizeLevel: parseInt(v, 10) })}
        >
          {[1,2,3,4,5,6,7,8,9].map((n) => {
            const { height } = computeStitchDimensions({ sizeLevel: n, baseHeight: 1 })
            const label = `#${n} (${height.toFixed(2)})`
            return (
              <option key={n} value={n}>{label}</option>
            )
          })}
        </Select>
      </Row>

      <Row label="Inc/Dec Factor">
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={settings.increaseFactor ?? settings.decreaseFactor ?? 1.0}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setSettings({ increaseFactor: v, decreaseFactor: v })
          }}
          style={{ width: 180 }}
        />
      </Row>

      <Row label="Inc/Dec Distribution">
        <Select
          value={settings.planIncreaseMode || settings.planDecreaseMode || settings.planSpacingMode || 'even'}
          onChange={(v) => setSettings({ planIncreaseMode: v, planDecreaseMode: v })}
          style={{ width: 180 }}
        >
          <option value="even">Even</option>
          <option value="jagged">Jagged</option>
        </Select>
      </Row>

      <Row label="Scaffold Planner">
        <Select
          value={settings.scaffoldVersion ?? 'v1'}
          onChange={(v) => setSettings({ scaffoldVersion: v })}
          style={{ width: 180 }}
        >
          <option value="v1">V1 (bucket-based)</option>
        </Select>
      </Row>

      <Row label="Show Full Scaffold">
        <input
          type="checkbox"
          checked={Boolean(settings.showFullScaffold)}
          onChange={(e) => setSettings({ showFullScaffold: e.target.checked })}
        />
      </Row>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating…' : 'Generate Layers'}
        </button>
        <button className="btn" onClick={handleGenerateNodes} disabled={isGenerating || isGeneratingNodes}>
          {isGeneratingNodes ? 'Placing…' : 'Generate Nodes'}
        </button>
        <button className="btn" onClick={() => {
          const data = exportJSON()
          const blob = new Blob([data], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'layerlines.json'
          a.click()
          URL.revokeObjectURL(url)
        }}>
          Export JSON
        </button>
      </div>

      <div className="properties-section" style={{ marginTop: 15 }}>
        <h3>Stats</h3>
        <Row label="Layers">{generated.stats.layerCount}</Row>
        <Row label="Lines">{generated.stats.totalLineCount}</Row>
      </div>

      <div className="properties-section" style={{ marginTop: 15 }}>
        <h3>Visibility</h3>
        <div className="property-item">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showScaffold}
              onChange={(e) => setVisibility({ showScaffold: e.target.checked })}
            />
            Show scaffold
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showNodes}
              onChange={(e) => setVisibility({ showNodes: e.target.checked })}
            />
            Show nodes
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showNodePoints}
              onChange={(e) => setVisibility({ showNodePoints: e.target.checked })}
            />
            Show node points
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 120 }}>Visible transition layers:</span>
            {(() => {
              const maxSteps = Array.isArray(chainScaffoldByLayer) ? chainScaffoldByLayer.length : 0
              const clamped = Math.min(Math.max(0, ui.visibleLayerCount || 0), maxSteps)
              const disabled = maxSteps === 0
              return (
                <>
                  <input
                    type="range"
                    min={0}
                    max={maxSteps}
                    step={1}
                    value={clamped}
                    disabled={disabled}
                    onChange={(e) => setVisibility({ visibleLayerCount: parseInt(e.target.value || '0', 10) })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: 60, textAlign: 'right' }}>{clamped} / {maxSteps}</span>
                </>
              )
            })()}
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showNextPoints}
              onChange={(e) => setVisibility({ showNextPoints: e.target.checked })}
            />
            Show next-layer points
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showSpacing}
              onChange={(e) => setVisibility({ showSpacing: e.target.checked })}
            />
            Show per-layer spacing
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showIncDec}
              onChange={(e) => setVisibility({ showIncDec: e.target.checked })}
            />
            Show inc/dec counts
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={ui.showNodeIndices}
              onChange={(e) => setVisibility({ showNodeIndices: e.target.checked })}
            />
            Show node indices
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 120 }}>Tighten Factor:</span>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={settings.tightenFactor || 0.8}
              onChange={(e) => setSettings({ tightenFactor: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{settings.tightenFactor || 0.8}</span>
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <span className="property-label">Handedness</span>
          <Select
            value={settings.handedness || 'right'}
            onChange={(v) => setSettings({ handedness: v })}
          >
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </Select>
        </div>
      </div>

      <div className="properties-section" style={{ marginTop: 15 }}>
        <h3>Options</h3>
        <div className="property-item">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.clipAgainstObjects}
              onChange={(e) => setSettings({ clipAgainstObjects: e.target.checked })}
            />
            Clip by other objects
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.intersectionHelpers}
              onChange={(e) => setSettings({ intersectionHelpers: e.target.checked })}
            />
            Intersection helpers (edge arcs/connectors)
          </label>
        </div>
        
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 120 }}>Min Fragment Ratio:</span>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={settings.minFragmentRatio ?? 0.2}
              onChange={(e) => setSettings({ minFragmentRatio: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{settings.minFragmentRatio}</span>
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <span className="property-label">Spacing mode</span>
          <select
            value={settings.spacingMode ?? 'world'}
            onChange={(e) => setSettings({ spacingMode: e.target.value })}
            style={{ width: 160, background: '#2a2a2a', border: '1px solid #505050', color: '#fff', padding: '4px 6px', borderRadius: 4 }}
          >
            <option value="world">World (equal surface distance)</option>
            <option value="surface">World+Arc (strict geodesic)</option>
          </select>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(settings.lodEnabled)}
              onChange={(e) => setSettings({ lodEnabled: e.target.checked })}
            />
            LOD thinning
          </label>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <span className="property-label">Render cap</span>
          <input
            type="number"
            value={settings.renderMaxLayers ?? 500}
            min={50}
            step={50}
            onChange={(e) => setSettings({ renderMaxLayers: parseInt(e.target.value || '500', 10) || 500 })}
            style={{ width: 100, background: '#2a2a2a', border: '1px solid #505050', color: '#fff', padding: '4px 6px', borderRadius: 4 }}
          />
          <span style={{ marginLeft: 6, color: '#aaa' }}>rings</span>
        </div>
        <div className="property-item" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.showMeasurements}
              onChange={(e) => setSettings({ showMeasurements: e.target.checked })}
            />
            Show measurements
          </label>
          <span style={{ marginLeft: 12, color: '#aaa' }}>every</span>
          <input
            type="number"
            min={1}
            value={settings.measureEvery ?? 5}
            onChange={(e) => setSettings({ measureEvery: Math.max(1, parseInt(e.target.value || '5', 10) || 5) })}
            style={{ width: 60, marginLeft: 8, background: '#2a2a2a', border: '1px solid #505050', color: '#fff', padding: '4px 6px', borderRadius: 4 }}
          />
          <span style={{ marginLeft: 6, color: '#aaa' }}>rings</span>
        </div>
      </div>
    </div>
  )
}

export default LayerlinePanel
