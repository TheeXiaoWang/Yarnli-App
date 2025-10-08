import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Example component for testing
function ExampleComponent({ message }: { message: string }) {
  return <div data-testid="example">{message}</div>
}

describe('Example Test Suite', () => {
  it('should render component with message', () => {
    render(<ExampleComponent message="Hello, World!" />)
    expect(screen.getByTestId('example')).toHaveTextContent('Hello, World!')
  })

  it('should perform basic math', () => {
    expect(2 + 2).toBe(4)
  })
})

// Example utility function test
describe('Utility Functions', () => {
  it('should validate basic logic', () => {
    const add = (a: number, b: number) => a + b
    expect(add(1, 2)).toBe(3)
  })
})

