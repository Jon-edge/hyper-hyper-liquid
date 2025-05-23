// Hyperliquid API service refactored to use react-use-websocket

import {
  asFetchedClearinghouseState,
  FetchedClearinghouseState,
  asAllMids
} from '../types/hyperliquidTypes'

// WebSocket connection status for UI indicator
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// Cache for mid prices
let cachedMidPrices: Record<string, string> = {}

/**
 * Fetches the user's state information including balance and positions from Hyperliquid API
 * @param address Ethereum address
 * @returns User state information including balance and positions
 */
export const fetchClearinghouseState = async (address: string): Promise<FetchedClearinghouseState | undefined> => {
  try {
    // Fetch user info from API
    console.log(`Fetching user state for address: ${address}`)
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address.toLowerCase()
      })
    })
    
    if (response.ok === false) {
      const errorText = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const rawData = await response.json()
    console.log('Info fetch response:', rawData)
    
    try {
      const clearinghouseState = asFetchedClearinghouseState(rawData)
      return clearinghouseState
    } catch (error) {
      console.error('Error parsing user state data:', error)
    }
  } catch (error) {
    console.error('Error fetching user state data:', error)
  }
}

/**
 * Get the WebSocket URL for Hyperliquid
 */
export const getHyperliquidWebSocketUrl = (): string => {
  return 'wss://api.hyperliquid.xyz/ws'
}

/**
 * Create a subscription message for mid prices
 */
export const createMidPricesSubscription = (): string => {
  return JSON.stringify({
    method: 'subscribe',
    subscription: {
      type: 'allMids'
    }
  })
}

/**
 * Process a WebSocket message and extract mid prices if applicable
 */
export const processMidPricesMessage = (message: unknown): Record<string, string> => {
  try {
    // Parse the message if it's a string
    const data = typeof message === 'string' ? JSON.parse(message) : message
    
    // Check if it's a mid prices response
    if (data != null && typeof data === 'object') {
      // Handle message where channel is specified (from WebSocket)
      if ('channel' in data && data.channel === 'allMids' && 'data' in data) {
        try {
          // Try to parse using our cleaner for type safety
          const allMidsData = asAllMids(data.data)
          const midPrices: Record<string, string> = { ...allMidsData.mids }
          
          // Log success for debugging
          console.log('Successfully processed mid prices:', Object.keys(midPrices).length)
          
          // Update the cached prices
          cachedMidPrices = { ...midPrices }
          return midPrices
        } catch (error) {
          console.error('Error parsing mid prices data with cleaner:', error)
          
          // Fallback: try to access the mids directly
          if (data.data != null && typeof data.data === 'object' && 'mids' in data.data) {
            try {
              const midsObj = data.data.mids as Record<string, string>
              cachedMidPrices = { ...midsObj }
              console.log('Fallback: processed mid prices directly:', Object.keys(cachedMidPrices).length)
              return cachedMidPrices
            } catch (fallbackError) {
              console.error('Fallback direct access also failed:', fallbackError)
            }
          }
        }
      } 
      // Handle direct message format (when testing or replaying data)
      else if ('mids' in data) {
        try {
          const midsObj = data.mids as Record<string, string>
          cachedMidPrices = { ...midsObj }
          return cachedMidPrices
        } catch (directError) {
          console.error('Error accessing mids directly:', directError)
        }
      }
    }
    
    // Return cached prices as fallback
    return cachedMidPrices
  } catch (error) {
    console.error('Error processing mid prices message:', error)
    return cachedMidPrices
  }
}

/**
 * Get the current cached mid prices
 */
export const getCachedMidPrices = (): Record<string, string> => {
  return { ...cachedMidPrices }
}

/**
 * Create a ping message for keeping the connection alive
 */
export const createPingMessage = (): string => {
  return JSON.stringify({ method: 'ping' })
}

/**
 * Check if a message is a pong response
 */
export const isPongMessage = (message: unknown): boolean => {
  try {
    const data = typeof message === 'string' ? JSON.parse(message) : message
    
    // Check for various forms of pong messages
    // 1. Direct pong {type: 'pong'}
    if (data != null && typeof data === 'object' && 'type' in data && data.type === 'pong') {
      return true
    }
    
    // 2. Channel format {channel: 'pong'}
    if (data != null && typeof data === 'object' && 'channel' in data && data.channel === 'pong') {
      return true
    }
    
    // 3. Plain string 'pong'
    if (data === 'pong') {
      return true
    }
    
    return false
  } catch {
    return false
  }
}
