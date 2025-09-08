import React from 'react'

export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple'
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
}

export function ToggleGroup({ children, type = 'single', value, onValueChange, className = '', ...props }: ToggleGroupProps) {
  const [internal, setInternal] = React.useState<string | string[]>(value ?? (type === 'single' ? '' : []))
  React.useEffect(() => { if (value !== undefined) setInternal(value) }, [value])

  const handleToggle = (val: string) => {
    if (type === 'single') {
      const next = val
      setInternal(next)
      onValueChange?.(next)
    } else {
      const curr = Array.isArray(internal) ? internal : []
      const next = curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val]
      setInternal(next)
      onValueChange?.(next)
    }
  }

  return (
    <div className={`inline-flex ${className}`} {...props}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        const val = (child.props as any).value as string
        const selected = type === 'single' ? internal === val : Array.isArray(internal) && internal.includes(val)
        return React.cloneElement(child as any, {
          'aria-pressed': selected,
          onClick: (e: any) => { (child.props as any).onClick?.(e); handleToggle(val) },
        })
      })}
    </div>
  )
}

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function ToggleGroupItem({ className = '', ...props }: ToggleGroupItemProps) {
  return <button className={`px-3 py-2 border first:rounded-l last:rounded-r -ml-[1px] ${className}`} {...props} />
}

export default ToggleGroup
