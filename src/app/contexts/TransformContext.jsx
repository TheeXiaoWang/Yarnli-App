import React, { createContext, useContext, useState } from 'react'

const TransformContext = createContext()

export const useTransformMode = () => {
  const context = useContext(TransformContext)
  if (!context) {
    throw new Error('useTransformMode must be used within a TransformProvider')
  }
  return context
}

export const TransformProvider = ({ children }) => {
  const [transformMode, setTransformMode] = useState('translate')
  const [isTransforming, setIsTransforming] = useState(false)

  return (
    <TransformContext.Provider value={{ 
      transformMode, 
      setTransformMode, 
      isTransforming, 
      setIsTransforming 
    }}>
      {children}
    </TransformContext.Provider>
  )
}
