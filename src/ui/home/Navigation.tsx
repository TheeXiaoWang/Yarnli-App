import React, { useState, useEffect } from 'react'

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-3 shadow-lg' : 'py-5'
      }`}
      style={{
        background: scrolled
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #E9E2FF' : '1px solid transparent'
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                boxShadow: '0 4px 12px rgba(199, 169, 255, 0.3)'
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
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Yarnli
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: '#2B244D' }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: '#2B244D' }}
            >
              How It Works
            </a>
            <a
              href="#/gallery"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: '#2B244D' }}
            >
              Gallery
            </a>
            <a
              href="#/tutorial"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: '#2B244D' }}
            >
              Tutorials
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/editor"
              className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
                color: '#ffffff'
              }}
            >
              Start Creating
              <span>→</span>
            </a>

            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: 'rgba(199, 169, 255, 0.1)',
                color: '#A484FF'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
