import React from 'react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Decorative gradients */}
        <div className="absolute top-20 left-10 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#E9E2FF] to-[#F2CFFF] blur-3xl opacity-40 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#F2CFFF] to-[#E9E2FF] blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '10s' }}></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Community badge */}
            <div className="inline-flex items-center rounded-full bg-[#ffffff] px-6 py-3 mb-8 shadow-sm border border-[#E9E2FF]">
              <span className="w-2 h-2 bg-[#98E1B3] rounded-full mr-3 animate-pulse"></span>
              <span className="text-[#2B244D] text-sm font-medium">Join the yarn artist community</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-[#2B244D] block mb-2">Design. Crochet.</span>
              <span className="bg-gradient-to-r from-[#C7A9FF] via-[#A484FF] to-[#F2CFFF] bg-clip-text text-transparent">
                Create Magic.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-[#6F679E] mb-12 max-w-2xl mx-auto leading-relaxed">
              Design and share yarn art with our CAD tools. Connect with fellow artists and bring your creative visions to life.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#/signup"
                className="group px-8 py-4 bg-gradient-to-r from-[#C7A9FF] to-[#A484FF] text-[#ffffff] font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center"
              >
                <span className="mr-2">✨</span>
                Get Started
                <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#/gallery"
                className="px-8 py-4 bg-[#ffffff] text-[#2B244D] font-semibold rounded-2xl border-2 border-[#E9E2FF] hover:border-[#C7A9FF] hover:bg-[#FAF9F7] transition-all duration-300 hover:scale-105"
              >
                Browse Gallery
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-[#2B244D] mb-4">
                Discover Your Path with Yarnli
              </h2>
              <p className="text-lg text-[#6F679E]">Everything you need to create beautiful yarn art</p>
            </div>

            {/* Feature cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 - Start Designing */}
              <div className="group bg-[#ffffff] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 border border-[#E9E2FF]">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C7A9FF] to-[#A484FF] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🎨</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2B244D] mb-3">Start Designing</h3>
                <p className="text-[#6F679E] mb-2 font-medium">Create with our CAD tools</p>
                <p className="text-[#6F679E] text-sm mb-6 leading-relaxed">
                  Use our powerful design tools to bring your yarn art ideas to life. From simple patterns to complex designs.
                </p>
                <a
                  href="#/signup"
                  className="inline-flex items-center text-[#A484FF] font-semibold hover:text-[#C7A9FF] transition-colors"
                >
                  Start Creating
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>

              {/* Card 2 - Browse Gallery */}
              <div className="group bg-[#ffffff] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 border border-[#E9E2FF]">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F2CFFF] to-[#E9E2FF] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🖼️</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2B244D] mb-3">Browse Gallery</h3>
                <p className="text-[#6F679E] mb-2 font-medium">Discover amazing projects</p>
                <p className="text-[#6F679E] text-sm mb-6 leading-relaxed">
                  Explore thousands of yarn art creations from our community. Get inspired and find your next project.
                </p>
                <a
                  href="#/gallery"
                  className="inline-flex items-center text-[#A484FF] font-semibold hover:text-[#C7A9FF] transition-colors"
                >
                  Explore Gallery
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>

              {/* Card 3 - Learn Techniques */}
              <div className="group bg-[#ffffff] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 border border-[#E9E2FF]">
                <div className="w-16 h-16 bg-gradient-to-br from-[#98E1B3] to-[#E9E2FF] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">📚</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2B244D] mb-3">Learn Techniques</h3>
                <p className="text-[#6F679E] mb-2 font-medium">Master all yarn types</p>
                <p className="text-[#6F679E] text-sm mb-6 leading-relaxed">
                  Comprehensive tutorials covering every yarn type and technique. From beginner basics to advanced methods.
                </p>
                <a
                  href="#/tutorial"
                  className="inline-flex items-center text-[#A484FF] font-semibold hover:text-[#C7A9FF] transition-colors"
                >
                  View Tutorials
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C7A9FF] via-[#A484FF] to-[#F2CFFF] opacity-5"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2B244D] mb-6">
              Ready to start your yarn art journey?
            </h2>
            <p className="text-xl text-[#6F679E] mb-8">
              Join thousands of artists creating beautiful crochet designs with Yarnli
            </p>
            <a
              href="#/signup"
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-[#C7A9FF] to-[#A484FF] text-[#ffffff] text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
            >
              <span className="mr-2">✨</span>
              Join Yarnli Today
              <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#E9E2FF]">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="text-[#6F679E] text-sm">
              © 2025 Yarnli. Friendly magic meets cozy craftsmanship.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
