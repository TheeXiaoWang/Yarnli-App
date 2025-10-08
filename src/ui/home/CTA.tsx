import React from 'react'

export default function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        <div
          className="relative rounded-[3rem] p-12 md:p-20 overflow-hidden border-2"
          style={{
            background: 'linear-gradient(135deg, rgba(199, 169, 255, 0.12) 0%, rgba(152, 225, 179, 0.12) 100%)',
            borderColor: '#E9E2FF'
          }}
        >
          {/* Simple decorative elements */}
          <div className="absolute top-8 right-8 text-4xl opacity-20">
            ✨
          </div>
          <div className="absolute bottom-8 left-8 text-4xl opacity-20">
            🧶
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#2B244D' }}>
              Ready to Start Creating?
            </h2>
            <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto" style={{ color: '#6F679E' }}>
              Join thousands of makers designing beautiful crochet patterns with Yarnli's 3D CAD tools
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
              <a
                href="#/editor"
                className="group px-10 py-5 rounded-full font-bold text-xl flex items-center gap-3 transition-all duration-300 hover:shadow-2xl hover:translate-y-[-2px] shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                  color: '#ffffff'
                }}
              >
                <span className="text-2xl">🎨</span>
                Start Designing
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#/tutorial"
                className="px-10 py-5 rounded-full font-semibold text-xl transition-all duration-300 hover:translate-y-[-2px] border-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#2B244D',
                  borderColor: '#E9E2FF'
                }}
              >
                View Tutorials
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-8 text-sm" style={{ color: '#6F679E' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span>Export your patterns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
