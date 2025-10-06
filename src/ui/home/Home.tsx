import React, { useEffect } from 'react'
import HeroSection from './HeroSection'
import FunnelCarousel from './FunnelCarousel'

export default function Home() {
  // Enable scrolling for home page (editor mode disables it)
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'

    return () => {
      // Restore overflow hidden when leaving home page
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
  }, [])

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-background via-card to-background">
      <HeroSection />
      <FunnelCarousel />
    </div>
  )
}


