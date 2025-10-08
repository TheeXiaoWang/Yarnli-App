import React from 'react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-20">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #C7A9FF 0%, #E9E2FF 100%)',
            animationDuration: '8s'
          }}
        />
        <div
          className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full blur-3xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #F2CFFF 0%, #98E1B3 100%)',
            animationDuration: '10s',
            animationDelay: '2s'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 border-2 shadow-sm" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#E9E2FF'
          }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#98E1B3' }} />
            <span style={{ color: '#2B244D', fontSize: '14px', fontWeight: '600' }}>
              The Future of Crochet Design
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-bold mb-6" style={{
            fontSize: 'clamp(2.5rem, 9vw, 6rem)',
            lineHeight: '1',
            color: '#2B244D',
            letterSpacing: '-0.02em'
          }}>
            Design. Visualize.
            <br />
            <span className="relative inline-block mt-3">
              <span style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 50%, #F2CFFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Crochet.
              </span>
              {/* Squiggle underline */}
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="16"
                viewBox="0 0 400 16"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M3 10C60 3, 120 15, 180 8C240 1, 300 12, 360 6C380 4, 395 8, 397 10"
                  stroke="#C7A9FF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto" style={{
            color: '#6F679E',
            lineHeight: '1.6'
          }}>
            Create stunning 3D crochet patterns with Yarnli's powerful CAD tools. Design, preview, and get step-by-step instructions for any crochetable object.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="#/editor"
              className="group px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                color: '#ffffff'
              }}
            >
              <span className="text-xl">🎨</span>
              Start Creating
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#/gallery"
              className="px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 border-2"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#2B244D',
                borderColor: '#E9E2FF'
              }}
            >
              View Examples
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 items-center" style={{ color: '#6F679E', fontSize: '14px' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>3D Visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>Auto-Generated Patterns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>Customizable Features</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
