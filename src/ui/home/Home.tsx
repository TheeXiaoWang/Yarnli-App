import React from 'react'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import Showcase from './Showcase'
import CTA from './CTA'
import Footer from './Footer'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#FAF9F7' }}>
      <Hero />
      <Features />
      <HowItWorks />
      <Showcase />
      <CTA />
      <Footer />
    </div>
  )
}
