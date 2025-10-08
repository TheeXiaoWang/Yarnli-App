import React from 'react'

export default function Features() {
  const features = [
    {
      icon: '🎯',
      title: '3D CAD Editor',
      description: 'Design crochet objects in real-time with our intuitive 3D modeling tools. See your creation come to life as you design.',
      color: '#C7A9FF'
    },
    {
      icon: '📋',
      title: 'Auto Pattern Generation',
      description: 'Get detailed, step-by-step crochet instructions automatically generated from your 3D design.',
      color: '#F2CFFF'
    },
    {
      icon: '✨',
      title: 'Customizable Features',
      description: 'Add eyes, embellishments, yarn strings, and other decorative elements to bring your designs to life.',
      color: '#98E1B3'
    },
    {
      icon: '📐',
      title: 'Precise Measurements',
      description: 'Control every aspect of your design with precise measurements, stitch counts, and scaling options.',
      color: '#A484FF'
    },
    {
      icon: '🎨',
      title: 'Material Preview',
      description: 'Visualize different yarn colors and textures on your design before you start crocheting.',
      color: '#E9E2FF'
    },
    {
      icon: '💾',
      title: 'Save & Share',
      description: 'Save your designs to the cloud and share them with the Yarnli community or export for personal use.',
      color: '#C7A9FF'
    }
  ]

  return (
    <section className="px-6 py-24 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            Everything You Need to Create
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Powerful features designed for makers of all skill levels
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderColor: '#E9E2FF',
                backdropFilter: 'blur(8px)'
              }}
            >
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{
                  background: `linear-gradient(135deg, ${feature.color} 0%, rgba(255,255,255,0.3) 100%)`,
                  boxShadow: `0 4px 16px ${feature.color}40`
                }}
              >
                <span className="text-3xl">{feature.icon}</span>
              </div>

              <h3 className="text-xl font-bold mb-3" style={{ color: '#2B244D' }}>
                {feature.title}
              </h3>
              <p className="leading-relaxed" style={{ color: '#6F679E', fontSize: '15px' }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
