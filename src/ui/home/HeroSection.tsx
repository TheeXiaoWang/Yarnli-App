import React from 'react'
// Replaced UI button and icons with simple elements to avoid external deps
// Using hash anchors instead of react-router

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 yarn-texture">
      {/* Simple background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-yarn-float"></div>
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-accent/30 blur-2xl animate-yarn-glow"></div>
      </div>

      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          {/* Community badge */}
          <div className="inline-flex items-center rounded-2xl border-2 border-accent/30 bg-card/80 px-6 py-3 text-sm backdrop-blur mb-8">
            <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-yarn-pulse"></span>
            <span className="text-foreground font-medium">Join the yarn artist community</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
            <span className="text-foreground block mb-2">Create with</span>
            <span className="bg-[var(--gradient-yarn-primary)] bg-clip-text text-transparent">
              Yarnli
            </span>
          </h1>

          {/* Simple description */}
          <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto">
            Design and share yarn art with our CAD tools. Connect with fellow artists and bring your creative visions to life.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a href="#/signup" className="yarn-button group text-lg px-8 py-4 inline-flex items-center justify-center rounded-xl">
              <span className="mr-3">✨</span>
              Get Started
              <span className="ml-3 group-hover:translate-x-2 transition-transform">→</span>
            </a>
            <a href="#/gallery" className="yarn-card border-2 border-accent/40 text-lg px-8 py-4 inline-flex items-center justify-center rounded-2xl">
              Browse Gallery
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;