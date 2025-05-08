// Hyperliquid API service

// WebSocket connection management
let websocket: WebSocket | null = null
let websocketSubscriptions: Map<string, (data: any) => void> = new Map()
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY_MS = 5000 // 5 seconds delay
let reconnectTimer: NodeJS.Timeout | null = null
let isIntentionalClose = false

// Ping/Pong mechanism to keep connection alive (based on Hyperliquid SDK)
let pingInterval: NodeJS.Timeout | null = null
const PING_INTERVAL = 50000 // 50 seconds (same as Python SDK)
let lastPongReceived = 0
let connectionHealthCheckInterval: NodeJS.Timeout | null = null
const CONNECTION_HEALTH_CHECK_INTERVAL = 15000 // 15 seconds

// WebSocket connection status for UI indicator
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
export let websocketStatus: WebSocketStatus = 'disconnected'

// Callback for status updates
let statusChangeCallbacks: ((status: WebSocketStatus) => void)[] = []

// Raw user state from the API
export interface RawUserState {
  assetPositions: {
    coin: string
    position?: {
      coin: string
      szi: string // Size
      entryPx: string // Entry price
      positionValue: string // Position value
      unrealizedPnl: string // Unrealized PnL
      returnOnEquity: string // Return on equity
      liquidationPx: string // Liquidation price
      marginUsed: string // Margin used
    }
  }[]
  crossMarginSummary: {
    accountValue: string // Total account value in USD
    totalMarginUsed: string // Total margin used
    totalNtlPos: string // Total notional position
    totalRawUsd: string // Total raw USD
    leverage: string // Account leverage
  }
  withdrawable: string // Withdrawable amount
}

// Processed user state for the UI
export interface UserState {
  accountValue: string
  withdrawable: string
  leverage: string
  positions: {
    coin: string
    size: string
    value: string
    entryPrice: string
    unrealizedPnl: string
    returnOnEquity: string
  }[]
}

/**
 * Fetches the user's state information including balance and positions from Hyperliquid API
 * @param address Ethereum address
 * @returns User state information including balance and positions
 */
export const fetchUserState = async (address: string): Promise<UserState> => {
  try {
    console.log('Fetching data for address:', address)
    
    // Format the address to lowercase to ensure consistency
    const formattedAddress = address.toLowerCase()
    
    // Use the correct API endpoint and format based on Hyperliquid docs
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: formattedAddress
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed with status ${response.status}:`, errorText)
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Info fetch response:', data)
    
    // Check if the response has the expected structure
    if (!data.crossMarginSummary || !data.assetPositions) {
      // If the user has no positions or is not found, return a default structure
      return {
        accountValue: '0',
        withdrawable: '0',
        leverage: '0',
        positions: []
      }
    }
    
    // Format the data for easier consumption
    return {
      accountValue: data.crossMarginSummary.accountValue || '0',
      withdrawable: data.withdrawable || '0',
      leverage: data.crossMarginSummary.leverage || '0',
      positions: Array.isArray(data.assetPositions) ? data.assetPositions.map((position: any) => {
        console.log('Position data:', JSON.stringify(position, null, 2))
        return {
          // Extract coin name from either position.coin or position.position.coin
          coin: position.coin || (position.position && position.position.coin) || '',
          size: position.position?.szi || '0',
          value: position.position?.positionValue || '0',
          entryPrice: position.position?.entryPx || '0',
          unrealizedPnl: position.position?.unrealizedPnl || '0',
          returnOnEquity: position.position?.returnOnEquity || '0'
        }
      }) : []
    }
  } catch (error) {
    console.error('Error fetching account balance:', error)
    // Return a default structure instead of throwing
    return {
      accountValue: '0',
      withdrawable: '0',
      leverage: '0',
      positions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    } as UserState & { error?: string }
  }
}

/**
 * Fetches available markets from Hyperliquid
 * @returns List of available markets
 */
// WebSocket connection management functions

/**
 * Initialize the WebSocket connection to Hyperliquid
 */
export const initializeWebSocket = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Clear any existing reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      
      // Update status
      updateWebSocketStatus('connecting')
      
      // Clean up existing connection if any
      if (websocket) {
        // Clear all existing event handlers to prevent memory leaks
        websocket.onopen = null
        websocket.onclose = null
        websocket.onerror = null
        websocket.onmessage = null
        
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
          isIntentionalClose = true
          websocket.close()
          isIntentionalClose = false
        }
        websocket = null
      }
      
      // Clear existing intervals
      if (pingInterval) {
        clearInterval(pingInterval)
        pingInterval = null
      }
      
      if (connectionHealthCheckInterval) {
        clearInterval(connectionHealthCheckInterval)
        connectionHealthCheckInterval = null
      }
      
      // Create new WebSocket connection
      console.log('Creating new WebSocket connection to wss://api.hyperliquid.xyz/ws')
      websocket = new WebSocket('wss://api.hyperliquid.xyz/ws')
      
      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        if (websocket && websocket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout after 10 seconds')
          if (websocket) {
            websocket.close()
          }
          updateWebSocketStatus('error')
          reject(new Error('Connection timeout'))
        }
      }, 10000) // 10 second timeout
      
      websocket.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('WebSocket connection established')
        updateWebSocketStatus('connected')
        reconnectAttempts = 0
        lastPongReceived = Date.now()
        
        // Send an initial ping immediately to test the connection
        try {
          websocket!.send(JSON.stringify({ method: 'ping' }))
          console.log('Initial ping sent')
        } catch (err) {
          console.error('Error sending initial ping:', err)
        }
        
        // Setup ping interval (30 seconds)
        pingInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            try {
              websocket.send(JSON.stringify({ method: 'ping' }))
            } catch (err) {
              console.error('Error sending ping:', err)
              // If we can't send a ping, the connection might be dead
              if (websocket) {
                websocket.close(1000, 'Unable to send ping')
              }
            }
          }
        }, 30000) // Send ping every 30 seconds
        
        // Check connection health every 10 seconds
        connectionHealthCheckInterval = setInterval(() => {
          if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
          
          const now = Date.now()
          const pongAge = now - lastPongReceived
          
          // If no pong received in 60 seconds, consider connection dead
          if (pongAge > 60000) { // 1 minute
            console.error(`No pong received in ${pongAge}ms, reconnecting...`)
            if (websocket) {
              websocket.close(1000, 'No pong received')
            }
          }
        }, 10000) // Check every 10 seconds
        
        // Resubscribe to all active subscriptions
        if (websocketSubscriptions.size > 0) {
          console.log(`Resubscribing to ${websocketSubscriptions.size} channels`)
          // We need to resubscribe to all channels
          websocketSubscriptions.forEach((_, channel) => {
            const [type, paramsStr] = channel.split(':', 2)
            if (type && paramsStr && websocket) {
              try {
                const params = JSON.parse(paramsStr)
                const subscriptionMessage = {
                  method: 'subscribe',
                  subscription: {
                    type,
                    ...params
                  }
                }
                websocket.send(JSON.stringify(subscriptionMessage))
              } catch (err) {
                console.error('Error resubscribing to channel:', err)
              }
            }
          })
        }
        
        resolve()
      }
      
      websocket.onclose = (event) => {
        clearTimeout(connectionTimeout)
        
        // Clear ping interval and health check
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }
        
        if (connectionHealthCheckInterval) {
          clearInterval(connectionHealthCheckInterval)
          connectionHealthCheckInterval = null
        }
        
        // Log more details about the close event
        console.log(`WebSocket connection closed: ${event.code} ${event.reason || 'No reason provided'}`)
        
        // Handle specific close codes
        if (event.code === 1006) {
          console.error('WebSocket closed abnormally (1006). This usually indicates a network issue or server timeout.')
        } else if (event.code === 1000) {
          console.log('WebSocket closed normally')
        }
        
        updateWebSocketStatus('disconnected')
        
        // Reset WebSocket reference
        websocket = null
        
        // Don't attempt to reconnect if closed intentionally
        if (!isIntentionalClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          // Use exponential backoff with jitter for reconnection
          const baseDelay = RECONNECT_DELAY_MS * Math.pow(1.5, Math.min(reconnectAttempts - 1, 5))
          const jitter = Math.random() * 1000 // Add up to 1 second of jitter
          const delay = baseDelay + jitter
          
          console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimer = setTimeout(() => {
            console.log('Executing reconnection attempt...')
            initializeWebSocket()
              .catch(err => console.error('Failed to reconnect WebSocket:', err))
          }, delay)
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Maximum reconnection attempts reached')
        }
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        updateWebSocketStatus('error')
        // Don't reject here, let onclose handle reconnection
      }
      
      // Define the message handler function
      const handleWebSocketMessage = (event: MessageEvent) => {
        try {
          // Check if the message is a pong response
          if (event.data === 'pong') {
            console.log('WebSocket message received: pong')
            lastPongReceived = Date.now()
            return
          }
          
          // Parse the message data
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message.channel)
          
          // Handle subscription response
          if (message.channel === 'subscriptionResponse') {
            console.log('Subscription confirmed:', message.data.subscription)
            return
          }
          
          // Log the full message structure for debugging
          // console.log('WebSocket message structure:', JSON.stringify(message, null, 2))
          
          // Handle webData2 updates. Preferred, for "frontend applications"
          // according to the docs.
          if (message.channel === 'webData2') {
            console.log('Received webData2 update')
            
            if (message.data && typeof message.data === 'object') {
              // Find subscriptions for this channel
              const user = message.data.user || ''
              const subscriptionKey = `webData2:{"user":"${user}"}`
              console.log('Processing webData2 update for subscription:', subscriptionKey)
              
              const callback = websocketSubscriptions.get(subscriptionKey)
              if (callback) {
                callback(message.data)
                console.log('Processed webData2 update for', websocketSubscriptions.size, 'subscriptions')
              }
            }
          }
          
          // Handle clearinghouseState updates (fallback)
          else if (message.channel === 'clearinghouseState') {
            console.log('Received clearinghouseState update')
            
            if (message.data) {
              // Check if the message contains position data
              if (!message.data.assetPositions) {
                console.log('No position array in clearinghouseState data')
              }
              
              // Find subscriptions for this channel
              const user = message.data.user || ''
              const subscriptionKey = `clearinghouseState:{"user":"${user}"}`
              console.log('Processing clearinghouseState update for subscription:', subscriptionKey)
              
              const callback = websocketSubscriptions.get(subscriptionKey)
              if (callback) {
                callback(message.data)
                console.log('Processed clearinghouseState update for', websocketSubscriptions.size, 'subscriptions')
              }
            }
          }
          
          // For any other channels, try to find a matching subscription
          else if (message.channel && message.data) {
            console.log(`Received update for channel: ${message.channel}`)
            
            // Try to find a matching subscription by channel prefix
            const matchingKeys = Array.from(websocketSubscriptions.keys())
              .filter(key => key.startsWith(message.channel + ':'))
            
            if (matchingKeys.length > 0) {
              console.log(`Found ${matchingKeys.length} matching subscriptions for channel ${message.channel}`)
              matchingKeys.forEach(key => {
                const callback = websocketSubscriptions.get(key)
                if (callback) {
                  callback(message.data)
                }
              })
            } else if (websocketSubscriptions.has(message.channel)) {
              // For channels without parameters
              const callback = websocketSubscriptions.get(message.channel)
              if (callback) {
                callback(message.data)
              }
            } else {
              console.log(`No handler found for channel: ${message.channel}`)
            }
          } else if (message.error) {
            console.error('WebSocket error response:', message.error)
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err)
          console.error('Raw message:', event.data)
        }
      }
      
      // Assign the message handler to the websocket
      websocket.onmessage = handleWebSocketMessage
    } catch (error) {
      console.error('Error initializing WebSocket:', error)
      updateWebSocketStatus('error')
      reject(error)
    }
  })
}

/**
 * Manually close the WebSocket connection
 */
export const closeWebSocketConnection = () => {
  // Clear reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // Clear ping interval
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  
  // Clear health check interval
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval)
    connectionHealthCheckInterval = null
  }
  
  // Close WebSocket connection
  if (websocket) {
    isIntentionalClose = true
    websocket.close()
    isIntentionalClose = false
    websocket = null
  }
  
  updateWebSocketStatus('disconnected')
}

/**
 * Update WebSocket status and notify all registered callbacks
 */
const updateWebSocketStatus = (status: WebSocketStatus) => {
  websocketStatus = status
  statusChangeCallbacks.forEach(callback => callback(status))
}

/**
 * Register a callback to be notified of WebSocket status changes
 */
export const onWebSocketStatusChange = (callback: (status: WebSocketStatus) => void) => {
  statusChangeCallbacks.push(callback)
  // Immediately call with current status
  callback(websocketStatus)
  
  // Return a function to unregister the callback
  return () => {
    statusChangeCallbacks = statusChangeCallbacks.filter(cb => cb !== callback)
  }
}

/**
 * Subscribe to a WebSocket channel
 */
export const subscribeToChannel = async <T>(channel: string, params: any, callback: (data: T) => void): Promise<() => void> => {
  // Ensure WebSocket is connected
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    await initializeWebSocket()
  }
  
  // Create subscription message
  const subscriptionMessage = {
    method: 'subscribe',
    subscription: {
      type: channel,
      ...params
    }
  }
  
  // Send subscription request
  websocket!.send(JSON.stringify(subscriptionMessage))
  
  // Store callback
  const subscriptionKey = `${channel}:${JSON.stringify(params)}`
  websocketSubscriptions.set(subscriptionKey, callback as any)
  
  // Return unsubscribe function
  return () => {
    const unsubscribeMessage = {
      method: 'unsubscribe',
      subscription: {
        type: channel,
        ...params
      }
    }
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(unsubscribeMessage))
    }
    
    websocketSubscriptions.delete(subscriptionKey)
  }
}

/**
 * Subscribe to user state updates via WebSocket
 */
// Cache for the last known good state for each user
const userStateCache: Record<string, UserState> = {}

export const subscribeToUserState = async (address: string, onUpdate: (data: UserState) => void): Promise<() => void> => {
  // Ensure WebSocket is connected before subscribing
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not connected, initializing...')
    await initializeWebSocket()
  }
  
  // Format the address for the API
  const formattedAddress = address.toLowerCase()
  console.log(`Subscribing to user state updates for address: ${formattedAddress}`)
  
  // Process the user data and transform it into UserState format
  const processUserData = (wsData: any) => {
    // Handle webData2 format (has clearinghouseState nested inside)
    let data = wsData
    if (wsData.clearinghouseState) {
      console.log('Processing webData2 format with nested clearinghouseState')
      data = wsData.clearinghouseState
    }
    
    // Check if we have the expected data structure
    if (!data.crossMarginSummary) {
      console.log('Missing crossMarginSummary in user state update')
    }
    
    // Count positions if available
    let positionCount = 0
    if (Array.isArray(data.assetPositions)) {
      positionCount = data.assetPositions.length
      console.log('Found', positionCount, 'positions')
    }
    
    // Transform data to UserState format
    const userState: UserState = {
      accountValue: data.crossMarginSummary?.accountValue || '0',
      withdrawable: data.withdrawable || '0',
      leverage: data.crossMarginSummary?.totalNtlPos ? 
        (parseFloat(data.crossMarginSummary.totalNtlPos) / parseFloat(data.crossMarginSummary.accountValue)).toFixed(2) : 
        '0',
      positions: Array.isArray(data.assetPositions) ? data.assetPositions.map((position: any) => ({
        coin: position.position?.coin || '',
        size: position.position?.szi || '0',
        value: position.position?.positionValue || '0',
        entryPrice: position.position?.entryPx || '0',
        unrealizedPnl: position.position?.unrealizedPnl || '0',
        returnOnEquity: position.position?.returnOnEquity || '0'
      })) : []
    }
    
    console.log('Transformed account balance:', {
      accountValue: userState.accountValue,
      withdrawable: userState.withdrawable,
      leverage: userState.leverage,
      positionCount: userState.positions.length
    })
    
    // Call the callback with the transformed data
    onUpdate(userState)
  }
  
  // Create subscription for WebData2 which contains aggregate user information
  const webData2Key = `webData2:{"user":"${formattedAddress}"}`
  
  // Also keep the clearinghouseState subscription as fallback
  const clearinghouseKey = `clearinghouseState:{"user":"${formattedAddress}"}`
  
  // Set both subscriptions to use the same callback
  websocketSubscriptions.set(webData2Key, processUserData)
  websocketSubscriptions.set(clearinghouseKey, processUserData)
  
  console.log('Setting up subscriptions with keys:', webData2Key, clearinghouseKey)
  
  // Send subscription request for WebData2
  const webData2Message = {
    method: 'subscribe',
    subscription: {
      type: 'webData2',
      user: formattedAddress
    }
  }
  
  // Also send clearinghouseState subscription as fallback
  const clearinghouseMessage = {
    method: 'subscribe',
    subscription: {
      type: 'clearinghouseState',
      user: formattedAddress
    }
  }
  
  // Send subscription requests if WebSocket is connected
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    // Send both subscription requests
    websocket.send(JSON.stringify(webData2Message))
    console.log('Sent webData2 subscription request')
    
    websocket.send(JSON.stringify(clearinghouseMessage))
    console.log('Sent clearinghouse state subscription request')
  } else {
    console.error('WebSocket not connected, subscription requests not sent')
  }
  
  // Return unsubscribe function
  return () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      // Unsubscribe from webData2
      websocket.send(JSON.stringify({
        method: 'unsubscribe',
        subscription: {
          type: 'webData2',
          user: formattedAddress
        }
      }))
      
      // Unsubscribe from clearinghouseState
      websocket.send(JSON.stringify({
        method: 'unsubscribe',
        subscription: {
          type: 'clearinghouseState',
          user: formattedAddress
        }
      }))
    }
    
    // Clean up both subscriptions
    websocketSubscriptions.delete(webData2Key)
    websocketSubscriptions.delete(clearinghouseKey)
  }
}

/**
 * Subscribe to market updates via WebSocket
 */
export const subscribeToMarkets = async (callback: (data: any) => void): Promise<() => void> => {
  return subscribeToChannel<any>('allMeta', {}, callback)
}

// Keep the original fetch functions as fallbacks

export const fetchMarkets = async () => {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'allMeta'
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching markets:', error)
    throw error
  }
}
