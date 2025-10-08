import React from 'react'

export default function Features() {
  const features = [
    {
      icon: '🎯',
      title: '3D CAD Editor',
      description: 'Design crochet objects in real-time with our intuitive 3D modeling tools. See your creation come to life as you design with instant visual feedback.',
      color: '#C7A9FF',
      highlights: ['Drag & drop interface', 'Real-time updates', 'Undo/redo support']
    },
    {
      icon: '📋',
      title: 'Auto Pattern Generation',
      description: 'Get detailed, step-by-step crochet instructions automatically generated from your 3D design. Every stitch calculated perfectly.',
      color: '#F2CFFF',
      highlights: ['Row-by-row instructions', 'Stitch diagrams', 'PDF export']
    },
    {
      icon: '✨',
      title: 'Customizable Features',
      description: 'Add eyes, embellishments, yarn strings, and other decorative elements to bring your designs to life with personality.',
      color: '#98E1B3',
      highlights: ['Decoration library', 'Custom placement', 'Color variations']
    },
    {
      icon: '📐',
      title: 'Precise Measurements',
      description: 'Control every aspect of your design with precise measurements, stitch counts, and scaling options. Get it right every time.',
      color: '#A484FF',
      highlights: ['Custom gauge input', 'Size adjustments', 'Material calculator']
    },
    {
      icon: '🎨',
      title: 'Material Preview',
      description: 'Visualize different yarn colors and textures on your design before you start crocheting. See exactly how it will look.',
      color: '#E9E2FF',
      highlights: ['Color picker', 'Texture simulation', 'Yarn suggestions']
    },
    {
      icon: '💾',
      title: 'Save & Share',
      description: 'Save your designs to the cloud and share them with the Yarnli community or export for personal use. Your work is always safe.',
      color: '#C7A9FF',
      highlights: ['Cloud storage', 'Export options', 'Community sharing']
    },
    {
      icon: '🔄',
      title: 'Version Control',
      description: 'Track changes and revert to previous versions. Experiment freely knowing you can always go back to what worked.',
      color: '#98E1B3',
      highlights: ['Auto-save', 'Version history', 'Compare versions']
    },
    {
      icon: '📱',
      title: 'Cross-Device Sync',
      description: 'Start designing on your computer and continue on your tablet. Your projects sync seamlessly across all devices.',
      color: '#F2CFFF',
      highlights: ['Cloud sync', 'Mobile friendly', 'Offline mode']
    }
  ]

  return (
    <section id="features" className="px-6 py-24 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#2B244D' }}>
            Everything You Need to Create
          </h2>
          <p className="text-xl md:text-2xl" style={{ color: '#6F679E' }}>
            Powerful features designed for makers of all skill levels
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-10 rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderColor: '#E9E2FF',
                backdropFilter: 'blur(8px)'
              }}
            >
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${feature.color} 0%, rgba(255,255,255,0.3) 100%)`,
                  boxShadow: `0 4px 16px ${feature.color}40`
                }}
              >
                <span className="text-4xl">{feature.icon}</span>
              </div>

              <h3 className="text-2xl font-bold mb-4" style={{ color: '#2B244D' }}>
                {feature.title}
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#6F679E' }}>
                {feature.description}
              </p>
              <div className="space-y-3">
                {feature.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: feature.color }} />
                    <span className="text-sm font-medium" style={{ color: '#6F679E' }}>
                      {highlight}
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
