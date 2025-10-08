import React, { useState } from 'react'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'Do I need to know how to code or use CAD software?',
      answer: 'Not at all! Yarnli is designed to be intuitive for everyone. If you can crochet, you can use Yarnli. Our interface is visual and user-friendly, with tutorials to help you get started.'
    },
    {
      question: 'What skill level do I need to use the patterns?',
      answer: 'Yarnli works for all skill levels! Beginners can start with simple shapes and our step-by-step guides, while advanced crocheters can create complex custom designs. You control the difficulty.'
    },
    {
      question: 'Can I export patterns to share or sell?',
      answer: 'Yes! You can export your patterns in multiple formats including PDF with images, text instructions, and stitch diagrams. Perfect for sharing with friends or selling on platforms like Etsy.'
    },
    {
      question: 'How accurate are the stitch calculations?',
      answer: 'Our algorithms calculate stitches with precision based on gauge, yarn weight, and hook size. You can customize gauge settings to match your personal tension for perfect results every time.'
    },
    {
      question: 'Can I use my own yarn and hook sizes?',
      answer: 'Absolutely! Yarnli lets you input your specific yarn weight, hook size, and gauge. The pattern automatically adjusts to give you accurate stitch counts and measurements for your materials.'
    },
    {
      question: 'Is there a mobile app?',
      answer: 'Yarnli works in your web browser on any device! While we don\'t have a native mobile app yet, our responsive design works great on tablets and phones for viewing patterns on the go.'
    },
    {
      question: 'Can I save my designs and come back later?',
      answer: 'Yes! Your designs are automatically saved to the cloud. You can access them from any device, make edits, and keep your entire pattern library organized in one place.'
    },
    {
      question: 'What if I need help or have questions?',
      answer: 'We have extensive tutorials, video guides, and documentation. Plus, our community forum is full of helpful makers. For specific issues, our support team is available via email.'
    }
  ]

  return (
    <section className="px-6 py-24 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2B244D' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xl" style={{ color: '#6F679E' }}>
            Everything you need to know about Yarnli
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl border-2 overflow-hidden transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderColor: openIndex === index ? '#C7A9FF' : '#E9E2FF'
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left transition-colors hover:bg-opacity-50"
                style={{
                  background: openIndex === index ? 'rgba(199, 169, 255, 0.05)' : 'transparent'
                }}
              >
                <span className="font-bold text-lg pr-8" style={{ color: '#2B244D' }}>
                  {faq.question}
                </span>
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
                  style={{
                    background: openIndex === index
                      ? 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)'
                      : 'rgba(199, 169, 255, 0.1)',
                    transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)'
                  }}
                >
                  <span style={{ color: openIndex === index ? '#ffffff' : '#A484FF' }}>
                    +
                  </span>
                </div>
              </button>

              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openIndex === index ? '500px' : '0'
                }}
              >
                <div className="p-6 pt-0">
                  <p style={{ color: '#6F679E', lineHeight: '1.7' }}>
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-12 p-8 rounded-2xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(199, 169, 255, 0.08) 0%, rgba(152, 225, 179, 0.08) 100%)',
            border: '2px solid #E9E2FF'
          }}
        >
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#2B244D' }}>
            Still have questions?
          </h3>
          <p className="mb-6" style={{ color: '#6F679E' }}>
            Our community and support team are here to help
          </p>
          <a
            href="#/tutorial"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #C7A9FF 0%, #A484FF 100%)',
              color: '#ffffff'
            }}
          >
            Visit Help Center
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
