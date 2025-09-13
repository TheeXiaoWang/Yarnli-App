import React from 'react'
// Simple horizontally scrollable list instead of carousel dependency
// Using hash anchors instead of react-router

const slides = [
  {
    id: 1,
    title: "Start Designing",
    subtitle: "Create with our CAD tools",
    description: "Use our powerful design tools to bring your yarn art ideas to life. From simple patterns to complex designs.",
    buttonText: "Start Creating",
    buttonLink: "#/signup",
    variant: "default" as const,
    background: "bg-[var(--gradient-yarn-primary)]"
  },
  {
    id: 2,
    title: "Browse Gallery",
    subtitle: "Discover amazing projects",
    description: "Explore thousands of yarn art creations from our community. Get inspired and find your next project.",
    buttonText: "Explore Gallery",
    buttonLink: "#/gallery",
    variant: "secondary" as const,
    background: "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
  },
  {
    id: 3,
    title: "Learn Techniques",
    subtitle: "Master all yarn types",
    description: "Comprehensive tutorials covering every yarn type and technique. From beginner basics to advanced methods.",
    buttonText: "View Tutorials",
    buttonLink: "#/tutorial",
    variant: "outline" as const,
    background: "bg-gradient-to-br from-green-500/20 to-blue-500/20"
  }
];

const FunnelCarousel = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 yarn-texture">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-yarn-float"></div>
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-accent/30 blur-2xl animate-yarn-glow"></div>
      </div>

      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Community badge */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center rounded-2xl border-2 border-accent/30 bg-card/80 px-6 py-3 text-sm backdrop-blur mb-8">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-yarn-pulse"></span>
              <span className="text-foreground font-medium">Join the yarn artist community</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-foreground block mb-2">Discover Your Path with</span>
              <span className="bg-[var(--gradient-yarn-primary)] bg-clip-text text-transparent">
                Yarnli
              </span>
            </h1>
          </div>

          {/* Horizontal Scroll List */}
          <div className="w-full overflow-x-auto">
            <div className="flex gap-3 w-max pr-3">
              {slides.map((slide) => (
                <div key={slide.id} className="w-[320px] md:w-[360px] lg:w-[380px] flex-shrink-0">
                  <div className="p-1">
                    <div className={`yarn-card relative overflow-hidden rounded-2xl p-8 h-[400px] flex flex-col justify-between ${slide.background}`}>
                      {/* Icon placeholder */}
                      <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-full bg-card/80 backdrop-blur border" style={{borderColor: 'hsl(var(--border) / 0.5)'}}>
                          <span className="h-8 w-8 text-primary inline-block">✦</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="text-center flex-grow">
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          {slide.title}
                        </h3>
                        <p className="text-primary font-semibold mb-4">
                          {slide.subtitle}
                        </p>
                        <p className="text-muted-foreground text-sm mb-6">
                          {slide.description}
                        </p>
                      </div>

                      {/* Button */}
                      <div className="flex justify-center">
                        <a href={slide.buttonLink} className="yarn-button group w-full max-w-48 inline-flex items-center justify-center rounded-xl px-4 py-2">
                          {slide.variant === 'default' && <span className="mr-2">✨</span>}
                          {slide.buttonText}
                          <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-lg text-muted-foreground mb-6">
              Ready to start your yarn art journey?
            </p>
            <a href="#/signup" className="yarn-button group text-lg px-8 py-4 inline-flex items-center justify-center rounded-xl">
              <span className="mr-3">✨</span>
              Join Yarnli Today
              <span className="ml-3 transition-transform group-hover:translate-x-2">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FunnelCarousel;