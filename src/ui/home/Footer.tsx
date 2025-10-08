import React from 'react'

export default function Footer() {
  return (
    <footer className="px-6 py-16 border-t" style={{ borderColor: '#E9E2FF' }}>
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🧶</span>
              <span className="text-2xl font-bold" style={{ color: '#2B244D' }}>
                Yarnli
              </span>
            </div>
            <p className="mb-4" style={{ color: '#6F679E', fontSize: '15px', lineHeight: '1.6' }}>
              The modern CAD tool for crochet designers. Create 3D patterns, visualize your designs, and get detailed instructions automatically.
            </p>
            <p className="text-sm" style={{ color: '#6F679E' }}>
              Friendly magic meets cozy craftsmanship.
            </p>
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
