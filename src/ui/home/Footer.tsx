import React, { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <footer className="px-6 py-16 border-t" style={{ borderColor: '#E9E2FF' }}>
      <div className="max-w-7xl mx-auto">
        {/* Newsletter Section */}
        <div className="mb-16">
          <div
            className="rounded-3xl p-10 md:p-12 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(199, 169, 255, 0.08) 0%, rgba(152, 225, 179, 0.08) 100%)',
              border: '2px solid #E9E2FF'
            }}
          >
            <div className="max-w-2xl mx-auto text-center relative z-10">
              <div className="text-4xl mb-4">💌</div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#2B244D' }}>
                Stay Updated
              </h3>
              <p className="mb-6" style={{ color: '#6F679E' }}>
                Get the latest patterns, tips, and updates delivered to your inbox
              </p>

              {subscribed ? (
                <div
                  className="py-4 px-6 rounded-xl inline-flex items-center gap-2"
                  style={{
                    background: 'rgba(152, 225, 179, 0.2)',
                    color: '#2B244D'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#98E1B3" strokeWidth="2"/>
                    <path d="M6 10l3 3 5-6" stroke="#98E1B3" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="font-semibold">Thanks for subscribing!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-5 py-3 rounded-xl border-2 outline-none transition-colors"
                    style={{
                      borderColor: '#E9E2FF',
                      color: '#2B244D'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#C7A9FF'}
                    onBlur={(e) => e.target.style.borderColor = '#E9E2FF'}
                    required
                  />
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                      color: '#ffffff'
                    }}
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C10.9 2 10 2.9 10 4C10 4.7 10.4 5.4 11 5.7V7.3C9.8 7.7 9 8.8 9 10V12C9 13.2 9.8 14.3 11 14.7V16.3C9.8 16.7 9 17.8 9 19V21C9 22.1 9.9 23 11 23H13C14.1 23 15 22.1 15 21V19C15 17.8 14.2 16.7 13 16.3V14.7C14.2 14.3 15 13.2 15 12V10C15 8.8 14.2 7.7 13 7.3V5.7C13.6 5.4 14 4.7 14 4C14 2.9 13.1 2 12 2Z" fill="white"/>
                  <circle cx="6" cy="8" r="2" fill="white" opacity="0.7"/>
                  <circle cx="18" cy="8" r="2" fill="white" opacity="0.7"/>
                  <circle cx="6" cy="16" r="2" fill="white" opacity="0.7"/>
                  <circle cx="18" cy="16" r="2" fill="white" opacity="0.7"/>
                </svg>
              </div>
              <span className="text-2xl font-bold" style={{ color: '#2B244D' }}>
                Yarnli
              </span>
            </div>
            <p className="mb-4" style={{ color: '#6F679E', fontSize: '15px', lineHeight: '1.6' }}>
              The modern CAD tool for crochet designers. Create 3D patterns, visualize your designs, and get detailed instructions automatically.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'rgba(199, 169, 255, 0.1)',
                  color: '#A484FF'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'rgba(199, 169, 255, 0.1)',
                  color: '#A484FF'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'rgba(199, 169, 255, 0.1)',
                  color: '#A484FF'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-bold mb-4" style={{ color: '#2B244D' }}>
              Product
            </h4>
            <ul className="space-y-2" style={{ color: '#6F679E', fontSize: '15px' }}>
              <li>
                <a href="#/editor" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  CAD Editor
                </a>
              </li>
              <li>
                <a href="#/gallery" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  Gallery
                </a>
              </li>
              <li>
                <a href="#/tutorial" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  Tutorials
                </a>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h4 className="font-bold mb-4" style={{ color: '#2B244D' }}>
              Community
            </h4>
            <ul className="space-y-2" style={{ color: '#6F679E', fontSize: '15px' }}>
              <li>
                <a href="#/gallery" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  Browse Patterns
                </a>
              </li>
              <li>
                <a href="#/tutorial" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  Learn Techniques
                </a>
              </li>
              <li>
                <a href="#/signup" className="hover:underline transition-colors" style={{ color: '#6F679E' }}>
                  Join Now
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: '#E9E2FF' }}>
          <p className="text-sm" style={{ color: '#6F679E' }}>
            © 2025 Yarnli. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm" style={{ color: '#6F679E' }}>
            <a href="#" className="hover:underline transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:underline transition-colors">
              Terms
            </a>
            <a href="#" className="hover:underline transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
