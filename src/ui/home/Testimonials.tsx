import React, { useState } from 'react'

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)

  const testimonials = [
    {
      name: 'Sarah Martinez',
      role: 'Pattern Designer',
      avatar: '👩‍🦰',
      quote: 'Yarnli has completely transformed how I create patterns. What used to take days now takes hours, and the 3D preview means my customers know exactly what they\'re getting.',
      rating: 5
    },
    {
      name: 'Emma Chen',
      role: 'Hobby Crocheter',
      avatar: '👩',
      quote: 'As a beginner, I was intimidated by complex patterns. Yarnli breaks everything down into simple steps with visual guides. Now I\'m creating amigurumi I never thought possible!',
      rating: 5
    },
    {
      name: 'Jessica Thompson',
      role: 'Crochet Teacher',
      avatar: '👩‍🏫',
      quote: 'The visualization tools are perfect for teaching. My students can see exactly how each stitch connects before they even pick up their hooks. It\'s revolutionized my classes.',
      rating: 5
    },
    {
      name: 'Maria Rodriguez',
      role: 'Craft Business Owner',
      avatar: '👩‍💼',
      quote: 'I sell custom crochet items, and Yarnli lets me show clients 3D previews before I start. It saves so much time and they love seeing their ideas come to life!',
      rating: 5
    }
  ]

  return (
    <section className="px-6 py-24 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(152, 225, 179, 0.03) 0%, rgba(199, 169, 255, 0.05) 100%)'
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            Loved by Makers Everywhere
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Hear what our community has to say
          </p>
        </div>

        <div className="relative">
          <div
            className="p-10 md:p-12 rounded-3xl shadow-xl border-2 relative"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: '#E9E2FF',
              minHeight: '320px'
            }}
          >
            <div className="text-6xl mb-6" style={{ color: '#C7A9FF' }}>
              "
            </div>

            <div className="mb-8">
              <p
                className="text-xl md:text-2xl leading-relaxed mb-6"
                style={{ color: '#2B244D' }}
              >
                {testimonials[activeIndex].quote}
              </p>

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)'
                  }}
                >
                  {testimonials[activeIndex].avatar}
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: '#2B244D' }}>
                    {testimonials[activeIndex].name}
                  </div>
                  <div className="text-sm" style={{ color: '#6F679E' }}>
                    {testimonials[activeIndex].role}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                      <span key={i} style={{ color: '#FFB800' }}>⭐</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className="transition-all duration-300"
                style={{
                  width: activeIndex === index ? '40px' : '12px',
                  height: '12px',
                  borderRadius: '6px',
                  background: activeIndex === index
                    ? 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)'
                    : '#E9E2FF'
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="text-center p-6">
            <div className="text-4xl mb-3">⭐⭐⭐⭐⭐</div>
            <div className="font-bold text-lg mb-1" style={{ color: '#2B244D' }}>
              4.9/5 Rating
            </div>
            <div className="text-sm" style={{ color: '#6F679E' }}>
              From 2,500+ reviews
            </div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-3">🏆</div>
            <div className="font-bold text-lg mb-1" style={{ color: '#2B244D' }}>
              Award Winning
            </div>
            <div className="text-sm" style={{ color: '#6F679E' }}>
              Best Craft Tech 2024
            </div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-3">💝</div>
            <div className="font-bold text-lg mb-1" style={{ color: '#2B244D' }}>
              96% Recommend
            </div>
            <div className="text-sm" style={{ color: '#6F679E' }}>
              Would suggest to a friend
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
