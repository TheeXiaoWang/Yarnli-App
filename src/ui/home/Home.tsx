import React from 'react'

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: '#FAF9F7' }}>
      {/* Playful Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-30 blur-3xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #C7A9FF 0%, #E9E2FF 100%)',
            animationDuration: '4s'
          }}
        />
        <div
          className="absolute top-1/4 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #F2CFFF 0%, #E9E2FF 100%)',
            animationDuration: '6s',
            animationDelay: '1s'
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full opacity-25 blur-3xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #98E1B3 0%, #E9E2FF 100%)',
            animationDuration: '5s',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 pt-24 pb-20">
          <div className="max-w-6xl mx-auto">
            {/* Community Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 shadow-sm" style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderColor: '#E9E2FF',
                backdropFilter: 'blur(8px)'
              }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#98E1B3' }} />
                <span style={{ color: '#2B244D', fontSize: '14px', fontWeight: '500' }}>
                  Join the yarn artist community
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <div className="text-center mb-10">
              <h1 className="font-bold mb-4" style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                lineHeight: '1.1',
                color: '#2B244D'
              }}>
                Design. Crochet.
                <br />
                <span className="relative inline-block mt-2">
                  <span style={{
                    background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 50%, #F2CFFF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Create Magic.
                  </span>
                  {/* Playful underline */}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="12"
                    viewBox="0 0 400 12"
                    fill="none"
                    style={{ opacity: 0.6 }}
                  >
                    <path
                      d="M2 8C50 2, 100 10, 150 5C200 0, 250 8, 300 4C350 0, 380 6, 398 8"
                      stroke="#C7A9FF"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed" style={{ color: '#6F679E' }}>
                Design and share yarn art with our CAD tools. Connect with fellow artists and bring your creative visions to life.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <a
                href="#/signup"
                className="group px-8 py-4 rounded-full font-semibold text-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                  color: '#ffffff'
                }}
              >
                <span className="text-xl">✨</span>
                Get Started
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#/gallery"
                className="px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 border-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#2B244D',
                  borderColor: '#E9E2FF'
                }}
              >
                Browse Gallery
              </a>
            </div>
          </div>
        </section>

        {/* Features Section with Playful Cards */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
                Discover Your Path with Yarnli
              </h2>
              <p className="text-lg" style={{ color: '#6F679E' }}>
                Everything you need to create beautiful yarn art
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1 - Start Designing */}
              <div
                className="group relative rounded-3xl p-8 transition-all duration-500 hover:scale-105 hover:rotate-1 border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,226,255,0.4) 100%)',
                  borderColor: '#E9E2FF',
                  boxShadow: '0 4px 20px rgba(199, 169, 255, 0.15)'
                }}
              >
                {/* Floating Icon */}
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                    boxShadow: '0 8px 20px rgba(199, 169, 255, 0.4)'
                  }}
                >
                  <span className="text-4xl">🎨</span>
                </div>

                <h3 className="text-2xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Start Designing
                </h3>
                <p className="text-sm font-semibold mb-3" style={{ color: '#A484FF' }}>
                  Create with our CAD tools
                </p>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#6F679E' }}>
                  Use our powerful design tools to bring your yarn art ideas to life. From simple patterns to complex designs.
                </p>

                <a
                  href="#/signup"
                  className="inline-flex items-center gap-2 font-semibold text-sm transition-all group-hover:gap-3"
                  style={{ color: '#A484FF' }}
                >
                  Start Creating
                  <span>→</span>
                </a>
              </div>

              {/* Card 2 - Browse Gallery */}
              <div
                className="group relative rounded-3xl p-8 transition-all duration-500 hover:scale-105 hover:-rotate-1 border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(242,207,255,0.4) 100%)',
                  borderColor: '#F2CFFF',
                  boxShadow: '0 4px 20px rgba(242, 207, 255, 0.15)'
                }}
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #F2CFFF 0%, #E9E2FF 100%)',
                    boxShadow: '0 8px 20px rgba(242, 207, 255, 0.4)'
                  }}
                >
                  <span className="text-4xl">🖼️</span>
                </div>

                <h3 className="text-2xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Browse Gallery
                </h3>
                <p className="text-sm font-semibold mb-3" style={{ color: '#A484FF' }}>
                  Discover amazing projects
                </p>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#6F679E' }}>
                  Explore thousands of yarn art creations from our community. Get inspired and find your next project.
                </p>

                <a
                  href="#/gallery"
                  className="inline-flex items-center gap-2 font-semibold text-sm transition-all group-hover:gap-3"
                  style={{ color: '#A484FF' }}
                >
                  Explore Gallery
                  <span>→</span>
                </a>
              </div>

              {/* Card 3 - Learn Techniques */}
              <div
                className="group relative rounded-3xl p-8 transition-all duration-500 hover:scale-105 hover:rotate-1 border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(152,225,179,0.3) 100%)',
                  borderColor: '#98E1B3',
                  boxShadow: '0 4px 20px rgba(152, 225, 179, 0.15)'
                }}
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #98E1B3 0%, #C7A9FF 100%)',
                    boxShadow: '0 8px 20px rgba(152, 225, 179, 0.4)'
                  }}
                >
                  <span className="text-4xl">📚</span>
                </div>

                <h3 className="text-2xl font-bold mb-2" style={{ color: '#2B244D' }}>
                  Learn Techniques
                </h3>
                <p className="text-sm font-semibold mb-3" style={{ color: '#A484FF' }}>
                  Master all yarn types
                </p>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#6F679E' }}>
                  Comprehensive tutorials covering every yarn type and technique. From beginner basics to advanced methods.
                </p>

                <a
                  href="#/tutorial"
                  className="inline-flex items-center gap-2 font-semibold text-sm transition-all group-hover:gap-3"
                  style={{ color: '#A484FF' }}
                >
                  View Tutorials
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className="rounded-[3rem] p-12 md:p-16 relative overflow-hidden border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(199, 169, 255, 0.1) 0%, rgba(242, 207, 255, 0.1) 100%)',
                borderColor: '#E9E2FF'
              }}
            >
              {/* Decorative Elements */}
              <div className="absolute top-6 right-6 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>✨</div>
              <div className="absolute bottom-6 left-6 text-3xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>🧶</div>

              <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10" style={{ color: '#2B244D' }}>
                Ready to start your yarn art journey?
              </h2>
              <p className="text-xl mb-10 relative z-10" style={{ color: '#6F679E' }}>
                Join thousands of artists creating beautiful crochet designs with Yarnli
              </p>

              <a
                href="#/signup"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-xl transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                  color: '#ffffff'
                }}
              >
                <span className="text-2xl">✨</span>
                Join Yarnli Today
                <span>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 border-t" style={{ borderColor: '#E9E2FF' }}>
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm" style={{ color: '#6F679E' }}>
              © 2025 Yarnli. Friendly magic meets cozy craftsmanship.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
