import React, { useState } from 'react'
import { computeStitchDimensions } from '../../domain/layerlines/stitches'
import { useSceneStore } from '../../app/stores/sceneStore'
import { useLayerlineStore } from '../../app/stores/layerlineStore'
import { useNodeStore } from '../../app/stores/nodeStore'
import { generateCompletePattern, generateLayersOnly, generateNodesFromExistingLayers } from '../../services/pattern'

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

  // State for unified pattern generation
  const [generationStage, setGenerationStage] = useState(null) // null | 'layers' | 'nodes'
  const [generationError, setGenerationError] = useState(null)
  const [useUnifiedButton, setUseUnifiedButton] = useState(true) // Feature flag for testing

  // Legacy handlers (kept for backward compatibility)
  const handleGenerate = async () => {
    await generate(objects)
  }

  const handleGenerateNodes = async () => {
    await generate(objects) // ensure we have up-to-date layers
    // Get fresh settings from store to ensure we have the latest values
    const freshSettings = useLayerlineStore.getState().settings
    const freshGenerated = useLayerlineStore.getState().generated
    console.log('[UI] Generating nodes with settings:', {
      magicRingDefaultStitches: freshSettings.magicRingDefaultStitches,
      yarnSizeLevel: freshSettings.yarnSizeLevel,
    })
    await generateNodesFromLayerlines({ generated: freshGenerated, settings: freshSettings })
  }

  // NEW: Unified pattern generation handler
  const handleGeneratePattern = async () => {
    setGenerationError(null)
    setGenerationStage('layers')

    try {
      const result = await generateCompletePattern({
        objects,
        settings,
        handedness: 'right',
        onLayersComplete: (layerResult) => {
          console.log('[UI] Layers complete:', layerResult.layers.length, 'layers')
          setGenerationStage('nodes')
        },
        onNodesComplete: (nodeResult) => {
          console.log('[UI] Nodes complete:', nodeResult?.nodes?.length || 0, 'nodes')
          setGenerationStage(null)
        },
        onError: (error) => {
          console.error('[UI] Pattern generation error:', error)
          setGenerationError(error.message)
          setGenerationStage(null)
        },
      })

      if (!result.success) {
        setGenerationError(result.error || 'Pattern generation failed')
      }
    } catch (error) {
      console.error('[UI] Unexpected error:', error)
      setGenerationError(error.message || 'Unexpected error occurred')
      setGenerationStage(null)
    }
  }

  // Helper to get button text based on current stage
  const getButtonText = () => {
    if (generationStage === 'layers') return 'Generating Layers...'
    if (generationStage === 'nodes') return 'Generating Nodes...'
    return 'Generate Pattern'
  }

  const isGeneratingPattern = generationStage !== null

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

      <Row label="Magic Ring Stitches">
        <input
          type="number"
          min={3}
          max={12}
          step={1}
          value={settings.magicRingDefaultStitches ?? 6}
          onChange={(e) => setSettings({ magicRingDefaultStitches: parseInt(e.target.value, 10) })}
          style={{ width: 60, background: '#2a2a2a', border: '1px solid #505050', color: '#fff', padding: '4px 6px', borderRadius: 4 }}
        />
        <span style={{ marginLeft: 8, color: '#aaa', fontSize: 12 }}>
          (auto: {(() => {
            const { nodes } = useNodeStore.getState()
            return nodes?.meta?.stitchCount || '?'
          })()})
        </span>
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

      {/* Sphere Tilt Scale removed: now computed dynamically from axis ratio */}

      <Row label="Show Full Scaffold">
        <input
          type="checkbox"
          checked={Boolean(settings.showFullScaffold)}
          onChange={(e) => setSettings({ showFullScaffold: e.target.checked })}
        />
      </Row>

      {/* Feature Toggle: Switch between unified and legacy buttons */}
      <div style={{ marginTop: 10, marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#aaa' }}>
          <input
            type="checkbox"
            checked={useUnifiedButton}
            onChange={(e) => setUseUnifiedButton(e.target.checked)}
          />
          Use unified "Generate Pattern" button (experimental)
        </label>
      </div>

      {/* Error Display */}
      {generationError && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: '#ff4444',
          color: '#fff',
          borderRadius: 4,
          fontSize: 12,
        }}>
          <strong>Error:</strong> {generationError}
          <button
            onClick={() => setGenerationError(null)}
            style={{
              marginLeft: 8,
              background: 'transparent',
              border: '1px solid #fff',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Button Section */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {useUnifiedButton ? (
          <>
            {/* NEW: Unified Pattern Generation Button */}
            <button
              className="btn btn-primary"
              onClick={handleGeneratePattern}
              disabled={isGeneratingPattern}
              style={{ flex: 1 }}
            >
              {getButtonText()}
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
          </>
        ) : (
          <>
            {/* LEGACY: Separate Layer and Node Buttons */}
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
          </>
        )}
      </div>

      {/* Progress Indicator */}
      {isGeneratingPattern && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#4CAF50' }}>
          {generationStage === 'layers' && '⏳ Stage 1/2: Generating layers...'}
          {generationStage === 'nodes' && '⏳ Stage 2/2: Generating nodes...'}
        </div>
      )}

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
            <div style={{ flex: 1, opacity: 0.6 }}>locked at 0.9</div>
            <span style={{ minWidth: 30, textAlign: 'right' }}>0.9</span>
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
        {settings.showMeasurements && (
          <div className="property-item" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <span style={{ minWidth: 120 }}>Measurement azimuth:</span>
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={settings.measurementAzimuthDeg ?? 0}
                onChange={(e) => setSettings({ measurementAzimuthDeg: parseInt(e.target.value || '0', 10) })}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 40, textAlign: 'right' }}>{settings.measurementAzimuthDeg ?? 0}°</span>
            </label>
          </div>
        )}
          <div className="property-item" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(settings.showLayerOrder)}
                onChange={(e) => setSettings({ showLayerOrder: e.target.checked })}
              />
              Show layer order indices
            </label>
          </div>

      </div>
    </div>
  )
}

export default LayerlinePanel
