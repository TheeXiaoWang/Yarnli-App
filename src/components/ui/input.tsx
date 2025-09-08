import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`border rounded px-3 py-2 bg-background text-foreground ${className}`}
      {...props}
    />
  )
)

Input.displayName = 'Input'

export default Input
