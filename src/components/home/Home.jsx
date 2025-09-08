import React from 'react'
import Nav from '../common/Nav'
import Hero from '../common/Hero'
import Cards from '../common/Cards'
import Footer from '../common/Footer'
import './home.css'

export default function Home() {
  return (
    <div className="page">
      <Nav />
      <Hero />
      <Cards />
      <footer className="footer">
        <a href="#/about">About</a>
        <a href="#/contact">Contact</a>
        <a href="#/privacy">Privacy</a>
      </footer>
    </div>
  );
}