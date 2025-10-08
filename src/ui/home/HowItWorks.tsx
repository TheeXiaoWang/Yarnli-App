import React from 'react'

export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Choose Your Shape',
      description: 'Start with basic shapes like spheres, cones, or cylinders. Or create custom forms.',
      icon: '🔷'
    },
    {
      number: '2',
      title: 'Design in 3D',
      description: 'Use our CAD tools to sculpt and refine your design. Adjust size, proportions, and details.',
      icon: '🎨'
    },
    {
      number: '3',
      title: 'Add Features',
      description: 'Personalize with eyes, embellishments, yarn strings, and decorative elements.',
      icon: '✨'
    },
    {
      number: '4',
      title: 'Get Instructions',
      description: 'Receive detailed crochet patterns with stitch counts, row-by-row instructions, and materials list.',
      icon: '📋'
    }
  ]

  return (
    <section className="px-6 py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full" style={{ background: '#C7A9FF' }} />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full" style={{ background: '#98E1B3' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            How It Works
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            From idea to finished pattern in four simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 -z-10" style={{
                  background: 'linear-gradient(to right, #E9E2FF 0%, #E9E2FF 50%, transparent 50%)',
                  backgroundSize: '8px 2px'
                }} />
              )}

              {/* Step Card */}
              <div className="text-center">
                {/* Number Badge */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-40"
                    style={{ background: '#C7A9FF' }}
                  />
                  <div
                    className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 font-bold text-3xl"
                    style={{
                      background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                      borderColor: '#ffffff',
                      color: '#ffffff'
                    }}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="text-5xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3" style={{ color: '#2B244D' }}>
                  {step.title}
                </h3>
                <p className="leading-relaxed" style={{ color: '#6F679E', fontSize: '15px' }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-16">
          <a
            href="#/editor"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
              color: '#ffffff'
            }}
          >
            Try It Now
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
