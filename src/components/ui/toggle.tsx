import React from 'react'

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className = '', pressed, onClick, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState<boolean>(!!pressed)
    React.useEffect(() => { if (pressed !== undefined) setIsPressed(pressed) }, [pressed])
    return (
      <button
        ref={ref}
        aria-pressed={isPressed}
        onClick={(e) => { setIsPressed((v) => !v); onClick?.(e) }}
        className={`inline-flex items-center justify-center rounded border px-3 py-2 ${className}`}
        {...props}
      />
    )
  }
)

Toggle.displayName = 'Toggle'

export default Toggle
