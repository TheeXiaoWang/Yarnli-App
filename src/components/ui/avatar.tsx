import React from 'react'

export function Avatar({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`inline-flex items-center justify-center rounded-full bg-muted overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  )
}

export function AvatarImage({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null
  return <img src={src} alt={alt} className={`object-cover w-full h-full ${className}`} />
}

export function AvatarFallback({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Avatar
