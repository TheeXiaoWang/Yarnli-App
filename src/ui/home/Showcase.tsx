import React from 'react'

export default function Showcase() {
  const examples = [
    {
      title: 'Amigurumi Animals',
      description: 'Create cute stuffed animals with customizable features',
      color: '#C7A9FF',
      emoji: '🐻'
    },
    {
      title: 'Home Decor',
      description: 'Design planters, baskets, and decorative items',
      color: '#F2CFFF',
      emoji: '🏠'
    },
    {
      title: 'Wearables',
      description: 'Craft hats, scarves, and fashion accessories',
      color: '#98E1B3',
      emoji: '🧢'
    }
  ]

  return (
    <section className="px-6 py-24">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            What You Can Create
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Endless possibilities for your crochet projects
          </p>
        </div>

        {/* Examples Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {examples.map((example, index) => (
            <div
              key={index}
              className="group relative rounded-3xl p-12 transition-all duration-500 hover:scale-105 border-2 overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderColor: example.color
              }}
            >
              {/* Background gradient */}
              <div
                className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20"
                style={{ background: `linear-gradient(135deg, ${example.color} 0%, transparent 100%)` }}
              />

              {/* Content */}
              <div className="relative z-10 text-center">
                <div className="text-7xl mb-6 transition-transform duration-500 group-hover:scale-125">
                  {example.emoji}
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#2B244D' }}>
                  {example.title}
                </h3>
                <p style={{ color: '#6F679E', fontSize: '15px' }}>
                  {example.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Highlight Box */}
        <div
          className="rounded-3xl p-12 md:p-16 border-2 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(199, 169, 255, 0.08) 0%, rgba(242, 207, 255, 0.08) 100%)',
            borderColor: '#E9E2FF'
          }}
        >
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="text-6xl mb-6">🎨✨🧶</div>
            <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2B244D' }}>
              Your Imagination, Our Technology
            </h3>
            <p className="text-lg mb-8" style={{ color: '#6F679E' }}>
              Whether you're making gifts, selling patterns, or exploring crochet as a hobby, Yarnli gives you the tools to bring any idea to life with precision and creativity.
            </p>
            <a
              href="#/gallery"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105 border-2"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#A484FF',
                borderColor: '#E9E2FF'
              }}
            >
              Browse Gallery
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
