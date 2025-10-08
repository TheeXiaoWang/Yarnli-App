import React, { useEffect } from 'react'
import Navigation from './Navigation'
import Hero from './Hero'
import SocialProof from './SocialProof'
import Features from './Features'
import HowItWorks from './HowItWorks'
import InteractiveDemo from './InteractiveDemo'
import Showcase from './Showcase'
import UseCases from './UseCases'
import Testimonials from './Testimonials'
import FAQ from './FAQ'
import CTA from './CTA'
import Footer from './Footer'

export default function Home() {
  useEffect(() => {
    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement
      if (target.tagName === 'A' && target.hash.startsWith('#') && !target.hash.startsWith('#/')) {
        e.preventDefault()
        const element = document.querySelector(target.hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }

    document.addEventListener('click', handleHashClick)
    return () => document.removeEventListener('click', handleHashClick)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#FAF9F7' }}>
      <Navigation />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <InteractiveDemo />
      <Showcase />
      <UseCases />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
