"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { AssetPosition } from '../types/hyperliquidTypes'

interface PositionContextType {
  selectedPosition: AssetPosition | null
  setSelectedPosition: (position: AssetPosition | null) => void
}

const PositionContext = createContext<PositionContextType | undefined>(undefined)

export const PositionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPosition, setSelectedPosition] = useState<AssetPosition | null>(null)
  
  return (
    <PositionContext.Provider value={{ selectedPosition, setSelectedPosition }}>
      {children}
    </PositionContext.Provider>
  )
}

export const usePosition = (): PositionContextType => {
  const context = useContext(PositionContext)
  if (context === undefined) {
    throw new Error('usePosition must be used within a PositionProvider')
  }
  return context
}
