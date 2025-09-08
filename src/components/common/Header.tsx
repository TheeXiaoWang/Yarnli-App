import React, { useState } from 'react'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Brand Logo - Left */}
        <a href="#/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="relative">
            <span className="h-8 w-8 text-primary inline-block animate-yarn-pulse">❤</span>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-yarn-glow"></div>
          </div>
          <span className="text-2xl font-bold text-primary">Yarnli</span>
        </a>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Navigation - Right Side */}
        <nav className="hidden md:flex mr-6">
          <ul className="flex items-center gap-2">
            {[
              { path: "#/tutorial", label: "Tutorial" },
              { path: "#/gallery", label: "Gallery" },
              { path: "#/editor", label: "CAD Studio" },
            ].map((item) => (
              <li key={item.path}>
                <a href={item.path} className="yarn-nav-link px-4 py-2">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop Auth Buttons - Far Right */}
        <div className="hidden md:flex items-center space-x-4">
          <a href="#/login" className="px-4 py-2 rounded-xl yarn-card">Log In</a>
          <a href="#/signup" className="yarn-button px-4 py-2 rounded-xl">Sign Up</a>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden px-2 py-2 rounded yarn-card" onClick={() => setIsMenuOpen((prev) => !prev)}>
          <span>{isMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container py-4 space-y-4">
            {[
              { path: "#/tutorial", label: "Tutorial" },
              { path: "#/gallery", label: "Gallery" },
              { path: "#/editor", label: "CAD Studio" },
            ].map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="block yarn-nav-link py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col space-y-2 pt-4 border-t border-border">
              <a href="#/login" className="px-4 py-2 rounded-xl yarn-card" onClick={() => setIsMenuOpen(false)}>Log In</a>
              <a href="#/signup" className="yarn-button px-4 py-2 rounded-xl" onClick={() => setIsMenuOpen(false)}>Sign Up</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
