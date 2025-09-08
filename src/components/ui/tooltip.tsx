import React from 'react'

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1 text-xs rounded bg-foreground text-background border">{children}</div>
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

export default Tooltip
