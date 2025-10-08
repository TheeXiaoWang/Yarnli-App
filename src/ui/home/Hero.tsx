import React from 'react'

export default function Hero() {
  return (
    <section className="relative flex items-center justify-center px-6 pt-32 pb-20 overflow-hidden" style={{ minHeight: '100vh' }}>
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #C7A9FF 0%, transparent 70%)',
            animation: 'float 20s ease-in-out infinite'
          }}
        />
        <div
          className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #98E1B3 0%, transparent 70%)',
            animation: 'float 25s ease-in-out infinite reverse'
          }}
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{
              background: 'rgba(199, 169, 255, 0.1)',
              border: '1px solid rgba(199, 169, 255, 0.3)'
            }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#98E1B3' }} />
              <span className="text-sm font-medium" style={{ color: '#2B244D' }}>
                The Future of Crochet Design
              </span>
            </div>

            <h1 className="font-bold mb-6" style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: '1.1',
              color: '#2B244D',
              letterSpacing: '-0.02em'
            }}>
              Design. Visualize.
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Crochet.
              </span>
            </h1>

            <p className="text-lg md:text-xl mb-8" style={{
              color: '#6F679E',
              lineHeight: '1.7',
              maxWidth: '540px'
            }}>
              Create stunning 3D crochet patterns with Yarnli's powerful CAD tools. Design, preview, and get step-by-step instructions for any crochetable object.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <a
                href="#/editor"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base shadow-lg transition-all hover:shadow-xl hover:translate-y-[-2px]"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                  color: '#ffffff'
                }}
              >
                Start Creating
                <span>→</span>
              </a>
              <a
                href="#/gallery"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#2B244D',
                  border: '2px solid #E9E2FF'
                }}
              >
                View Examples
              </a>
            </div>

            <div className="flex flex-wrap gap-6 text-sm" style={{ color: '#6F679E' }}>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#98E1B3" strokeWidth="2"/>
                  <path d="M6 10l3 3 5-6" stroke="#98E1B3" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>3D Visualization</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#98E1B3" strokeWidth="2"/>
                  <path d="M6 10l3 3 5-6" stroke="#98E1B3" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Auto-Generated Patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#98E1B3" strokeWidth="2"/>
                  <path d="M6 10l3 3 5-6" stroke="#98E1B3" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Customizable Features</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-square">
              <div
                className="absolute inset-0 rounded-3xl shadow-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,226,255,0.3) 100%)',
                  border: '2px solid rgba(199, 169, 255, 0.3)'
                }}
              >
                <div className="text-center p-12">
                  <div className="text-8xl mb-6">🧶</div>
                  <div className="text-6xl mb-4">✨</div>
                  <div className="flex gap-4 justify-center">
                    <div className="text-4xl">🎨</div>
                    <div className="text-4xl">👁️</div>
                    <div className="text-4xl">📐</div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -top-6 -right-6 w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                  animation: 'float 4s ease-in-out infinite'
                }}
              >
                <span className="text-4xl">🎯</span>
              </div>

              <div
                className="absolute -bottom-6 -left-6 w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #98E1B3 0%, #C7A9FF 100%)',
                  animation: 'float 5s ease-in-out infinite reverse'
                }}
              >
                <span className="text-3xl">📋</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
