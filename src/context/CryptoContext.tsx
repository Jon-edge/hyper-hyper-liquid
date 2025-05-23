"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  hyperliquidSocketService,
  ConnectionStatus
} from '@/services/hyperliquidSocketService'

// Define types for the context data
interface CryptoContextData {
  // Hyperliquid data
  hyperliquidPrices: Record<string, string>
  hyperliquidConnectionStatus: ConnectionStatus
  hyperliquidLastPong: number | null
  hyperliquidLastPriceUpdate: number | null
  
  // You can add more exchanges/sources here in the future
  // e.g. binancePrices, coinbasePrices, etc.
}

// Default context values
const defaultContextData: CryptoContextData = {
  hyperliquidPrices: {},
  hyperliquidConnectionStatus: 'disconnected',
  hyperliquidLastPong: null,
  hyperliquidLastPriceUpdate: null
}

// Create the context
const CryptoContext = createContext<CryptoContextData>(defaultContextData)

/**
 * Provider component for crypto data
 * This component subscribes to various crypto data sources and makes them available to child components
 */
export function CryptoProvider({ children }: { children: React.ReactNode }) {
  // State for Hyperliquid data
  const [hyperliquidPrices, setHyperliquidPrices] = useState<Record<string, string>>({})
  const [hyperliquidConnectionStatus, setHyperliquidConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [hyperliquidLastPong, setHyperliquidLastPong] = useState<number | null>(null)
  const [hyperliquidLastPriceUpdate, setHyperliquidLastPriceUpdate] = useState<number | null>(null)
  
  // Subscribe to Hyperliquid data on mount
  useEffect(() => {
    // Skip if in SSR environment
    if (typeof window === 'undefined') return
    
    console.log('Initializing crypto context subscriptions')
    
    // Subscribe to mid prices
    const unsubPrices = hyperliquidSocketService.subscribeToMidPrices((prices) => {
      // Filter out symbols that start with "@"
      const filteredPrices: Record<string, string> = {}
      Object.entries(prices).forEach(([symbol, price]) => {
        if (!symbol.startsWith('@')) {
          filteredPrices[symbol] = price
        }
      })
      
      setHyperliquidPrices(filteredPrices)
      setHyperliquidLastPriceUpdate(Date.now()) // Track when prices were last updated
    })
    
    // Subscribe to connection status
    const unsubStatus = hyperliquidSocketService.subscribeToConnectionStatus((status) => {
      setHyperliquidConnectionStatus(status)
    })
    
    // Subscribe to pong events
    const unsubPong = hyperliquidSocketService.subscribeToPongEvents((timestamp) => {
      setHyperliquidLastPong(timestamp)
    })
    
    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up crypto context subscriptions')
      unsubPrices()
      unsubStatus()
      unsubPong()
    }
  }, [])
  
  // Combine all data into context value
  const contextValue: CryptoContextData = {
    hyperliquidPrices,
    hyperliquidConnectionStatus,
    hyperliquidLastPong,
    hyperliquidLastPriceUpdate
  }
  
  return (
    <CryptoContext.Provider value={contextValue}>
      {children}
    </CryptoContext.Provider>
  )
}

/**
 * Hook to access crypto data from the context
 * @returns All crypto data from the context
 */
export function useCrypto(): CryptoContextData {
  const context = useContext(CryptoContext)
  
  if (context === undefined) {
    throw new Error('useCrypto must be used within a CryptoProvider')
  }
  
  return context
}
