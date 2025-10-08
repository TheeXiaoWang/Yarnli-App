import React from 'react'

export default function UseCases() {
  const useCases = [
    {
      title: 'Hobby Crafters',
      description: 'Perfect for makers who want to bring their creative ideas to life without the guesswork.',
      icon: '🧶',
      benefits: [
        'Easy-to-follow patterns',
        'Adjustable difficulty levels',
        'Visual guides and tutorials',
        'Save your favorite designs'
      ],
      color: '#C7A9FF'
    },
    {
      title: 'Pattern Sellers',
      description: 'Create professional patterns to sell with detailed instructions and beautiful 3D previews.',
      icon: '💼',
      benefits: [
        'Professional pattern export',
        'Accurate stitch calculations',
        'Custom branding options',
        'Multiple export formats'
      ],
      color: '#98E1B3'
    },
    {
      title: 'Teachers & Educators',
      description: 'Teach crochet with visual aids that help students understand complex patterns.',
      icon: '🎓',
      benefits: [
        '3D visualization for teaching',
        'Step-by-step breakdowns',
        'Shareable lesson plans',
        'Progress tracking'
      ],
      color: '#F2CFFF'
    },
    {
      title: 'Gift Makers',
      description: 'Design personalized, handmade gifts with confidence that they will turn out perfect.',
      icon: '🎁',
      benefits: [
        'Size customization',
        'Color preview',
        'Material calculators',
        'Project planning tools'
      ],
      color: '#A484FF'
    }
  ]

  return (
    <section className="px-6 py-24 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            Perfect For Every Maker
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Whether you're a hobbyist or professional, Yarnli adapts to your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group p-8 rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderColor: useCase.color
              }}
            >
              <div className="flex items-start gap-5 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${useCase.color} 0%, rgba(255,255,255,0.3) 100%)`,
                    boxShadow: `0 4px 16px ${useCase.color}40`
                  }}
                >
                  <span className="text-3xl">{useCase.icon}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ color: '#2B244D' }}>
                    {useCase.title}
                  </h3>
                  <p style={{ color: '#6F679E', lineHeight: '1.6' }}>
                    {useCase.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {useCase.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke={useCase.color} strokeWidth="2"/>
                      <path d="M6 10l3 3 5-6" stroke={useCase.color} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#2B244D' }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
