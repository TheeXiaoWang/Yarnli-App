import React from 'react'

export default function InteractiveDemo() {
  return (
    <section className="px-6 py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(199, 169, 255, 0.05) 50%, transparent 100%)'
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            See It In Action
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Watch how Yarnli transforms your ideas into detailed crochet patterns
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video"
            style={{
              background: 'linear-gradient(135deg, #2a1f3d 0%, #1f1830 100%)',
              border: '2px solid #E9E2FF'
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-6xl mb-6">🎬</div>
                <div className="text-white text-xl font-semibold mb-3">
                  Interactive 3D Preview
                </div>
                <div className="text-gray-300 text-sm mb-6">
                  Rotate, zoom, and explore your design
                </div>
                <a
                  href="#/editor"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                    color: '#ffffff'
                  }}
                >
                  Try Live Demo
                  <span>→</span>
                </a>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)'
                }}
              >
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Real-Time Visualization
                </h3>
                <p style={{ color: '#6F679E', lineHeight: '1.7' }}>
                  See your design update instantly as you adjust parameters. No waiting, no guessing.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #98E1B3 0%, #C7A9FF 100%)'
                }}
              >
                <span className="text-2xl">📐</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Precise Measurements
                </h3>
                <p style={{ color: '#6F679E', lineHeight: '1.7' }}>
                  Every stitch is calculated with precision. Get exact dimensions and stitch counts.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #A484FF 0%, #98E1B3 100%)'
                }}
              >
                <span className="text-2xl">🎨</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Customize Everything
                </h3>
                <p style={{ color: '#6F679E', lineHeight: '1.7' }}>
                  Adjust colors, add decorations, modify shapes. Full control at your fingertips.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F2CFFF 0%, #A484FF 100%)'
                }}
              >
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Export Your Pattern
                </h3>
                <p style={{ color: '#6F679E', lineHeight: '1.7' }}>
                  Download detailed instructions ready to follow, stitch by stitch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
