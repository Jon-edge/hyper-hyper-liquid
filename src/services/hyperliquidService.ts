// Hyperliquid API service

// WebSocket connection management
let websocket: WebSocket | null = null
import {
  AccountState,
  asFetchedClearinghouseState,
  asWsWebdata2,
  FetchedClearinghouseState,
  WsClearinghouseState
} from '../types/hyperliquidTypes'

// Track WebSocket subscriptions with their callbacks
const websocketSubscriptions: Map<string, (data: unknown) => void> = new Map()
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY_MS = 5000 // 5 seconds delay
let reconnectTimer: NodeJS.Timeout | null = null
let isIntentionalClose = false

// Ping/Pong mechanism to keep connection alive (based on Hyperliquid SDK)
let pingInterval: NodeJS.Timeout | null = null
let lastPongReceived = 0
let connectionHealthCheckInterval: NodeJS.Timeout | null = null

// WebSocket connection status for UI indicator
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
export let websocketStatus: WebSocketStatus = 'disconnected'

// Callback for status updates
let statusChangeCallbacks: ((status: WebSocketStatus) => void)[] = []

// Callbacks for message received
let messageCallbacks: (() => void)[] = []

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
 * Initialize the WebSocket connection to Hyperliquid
 */
export const initializeWebSocket = (address?: string, onUpdate?: (accountState?: AccountState) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Clear any existing reconnect timer
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      
      // Update status
      updateWebSocketStatus('connecting')
      
      // Clean up existing connection if any
      if (websocket != null) {
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
      if (pingInterval != null) {
        clearInterval(pingInterval)
        pingInterval = null
      }
      
      if (connectionHealthCheckInterval != null) {
        clearInterval(connectionHealthCheckInterval)
        connectionHealthCheckInterval = null
      }

      console.log('Creating new WebSocket connection')
      websocket = new WebSocket('wss://api.hyperliquid.xyz/ws')
      
      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        if (websocket != null && websocket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout after 10 seconds')
          if (websocket != null) {
            websocket.close()
          }
          updateWebSocketStatus('error')
          reject(new Error('Connection timeout'))
        }
      }, 10000) // 10 second timeout
      
      // Make sure websocket is initialized before setting event handlers
      if (websocket == null) {
        console.error('WebSocket initialization failed')
        updateWebSocketStatus('error')
        reject(new Error('WebSocket initialization failed'))
        return
      }
      
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
          
          // If we have an address, set up the subscription immediately
          if (address && address !== '') {
            console.log('Setting up subscription for address after connection:', address)
            
            // Send subscription requests directly instead of calling subscribeToUserState again
            // This avoids potential recursion issues
            const formattedAddress = address.toLowerCase()
            
            // Create and send webData2 subscription
            const webData2Message = {
              method: 'subscribe',
              subscription: {
                type: 'webData2',
                user: formattedAddress
              }
            }
            
            // Create and send clearinghouse subscription
            const clearinghouseMessage = {
              method: 'subscribe',
              subscription: {
                type: 'clearinghouseState',
                user: formattedAddress
              }
            }
            
            console.log('Sending subscription requests after reconnection')
            websocket!.send(JSON.stringify(webData2Message))
            console.log('Sent webData2 subscription after reconnection')
            
            websocket!.send(JSON.stringify(clearinghouseMessage))
            console.log('Sent clearinghouse subscription after reconnection')
            
            // Register the callback in the subscriptions map
            if (onUpdate) {
              const webData2Key = `webData2:{"user":"${formattedAddress}"}`
              const clearinghouseKey = `clearinghouseState:{"user":"${formattedAddress}"}`
              
              // Create a wrapper function that will process the data
              const processUserData = (rawData: unknown) => {
                console.log('Processing WebSocket data after reconnection:', rawData)
                try {
                  // Try to convert to AccountState and pass to callback
                  if (onUpdate && rawData) {
                    // Simple pass-through to onUpdate for now
                    if (typeof rawData === 'object' && rawData !== null) {
                      const data = rawData as any
                      // Create a minimal AccountState from the data
                      const accountState: AccountState = {
                        assetPositions: data.assetPositions || [],
                        crossMarginSummary: data.crossMarginSummary,
                        marginSummary: data.marginSummary,
                        withdrawable: data.withdrawable,
                        crossMaintenanceMarginUsed: data.crossMaintenanceMarginUsed
                      }
                      onUpdate(accountState)
                    }
                  }
                } catch (error) {
                  console.error('Error processing WebSocket data after reconnection:', error)
                }
              }
              
              // Register the callbacks
              websocketSubscriptions.set(webData2Key, processUserData)
              websocketSubscriptions.set(clearinghouseKey, processUserData)
              console.log('Registered WebSocket callbacks after reconnection')
            }
          }
        } catch (err) {
          console.error('Error sending initial ping:', err)
        }
        
        // Setup ping interval (30 seconds)
        pingInterval = setInterval(() => {
          if (websocket != null && websocket.readyState === WebSocket.OPEN) {
            try {
              websocket.send(JSON.stringify({ method: 'ping' }))
            } catch (err) {
              console.error('Error sending ping:', err)
              // If we can't send a ping, the connection might be dead
              if (websocket != null) {
                websocket.close(1000, 'Unable to send ping')
              }
            }
          }
        }, 30000) // Send ping every 30 seconds
        
        // Check connection health every 10 seconds
        connectionHealthCheckInterval = setInterval(() => {
          if (websocket == null || websocket.readyState !== WebSocket.OPEN) return
          
          const now = Date.now()
          const pongAge = now - lastPongReceived
          
          // If no pong received in 60 seconds, consider connection dead
          if (pongAge > 60000) { // 1 minute
            console.error(`No pong received in ${pongAge}ms, reconnecting...`)
            if (websocket != null) {
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
            if (type != null && type !== '' && paramsStr != null && paramsStr !== '' && websocket != null) {
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
          if (pingInterval != null) {
          clearInterval(pingInterval)
          pingInterval = null
        }
        
        if (connectionHealthCheckInterval != null) {
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
        if (isIntentionalClose === false && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
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
          // Notify message received - simple pulse trigger
          if (messageCallbacks.length > 0) {
            messageCallbacks.forEach(callback => callback())
          }
          
          // Check if the message is a pong response
          if (event.data === 'pong') {
            console.log('WebSocket message received: pong')
            lastPongReceived = Date.now()
            return
          }
          
          // Parse the message data
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message.channel)
          
          // Enhanced debugging - log the full message
          console.log('Full WebSocket message:', message)
          
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
            
            if (message.data != null && typeof message.data === 'object') {
              // Find subscriptions for this channel
              const user = message.data.user ?? ''
              const subscriptionKey = `webData2:{"user":"${user}"}`
              console.log('Processing webData2 update for subscription:', subscriptionKey)
              
              // Check if we have a subscription for this user
              const callback = websocketSubscriptions.get(subscriptionKey)
              if (callback != null) {
                // Process the data and call the callback
                callback(message.data)
                console.log('Processed webData2 update for', subscriptionKey)
              } else {
                console.log('No subscription found for webData2 update with key:', subscriptionKey)
                console.log('Available subscriptions:', Array.from(websocketSubscriptions.keys()))
              }
            }
          }
          
          // Note: We're no longer handling clearinghouseState separately since webData2 contains all needed data
          
          // For any other channels, try to find a matching subscription
          else if (message.channel != null && message.data != null) {
            console.log(`Received update for channel: ${message.channel}`)
            
            // Try to find a matching subscription by channel prefix
            const matchingKeys = Array.from(websocketSubscriptions.keys())
              .filter(key => key.startsWith(message.channel + ':'))
            
            if (matchingKeys.length > 0) {
              console.log(`Found ${matchingKeys.length} matching subscriptions for channel ${message.channel}`)
              matchingKeys.forEach(key => {
                const callback = websocketSubscriptions.get(key)
                if (callback != null) {
                  callback(message.data)
                }
              })
            } else if (websocketSubscriptions.has(message.channel)) {
              // For channels without parameters
              const callback = websocketSubscriptions.get(message.channel)
              if (callback != null) {
                callback(message.data)
              }
            } else {
              console.log(`No handler found for channel: ${message.channel}`)
            }
          } else if (message.error != null) {
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
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // Clear ping interval
  if (pingInterval != null) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  
  // Clear health check interval
  if (connectionHealthCheckInterval != null) {
    clearInterval(connectionHealthCheckInterval)
    connectionHealthCheckInterval = null
  }
  
  // Close WebSocket connection
  if (websocket != null) {
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
 * Register a callback to be notified when a WebSocket message is received
 * Used for UI indicators to show message activity
 */
export const onWebSocketMessage = (callback: () => void) => {
  messageCallbacks.push(callback)
  
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback)
  }
}

/**
 * Subscribe to a WebSocket channel
 */
interface SubscriptionParams {
  [key: string]: string | number | boolean | object;
}

export const subscribeToChannel = async <T>(channel: string, params: SubscriptionParams, callback: (data: T) => void): Promise<() => void> => {
  // Ensure WebSocket is connected
  if (websocket == null || websocket.readyState !== WebSocket.OPEN) {
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
  websocketSubscriptions.set(subscriptionKey, callback as (data: unknown) => void)
  
  // Return unsubscribe function
  return () => {
    const unsubscribeMessage = {
      method: 'unsubscribe',
      subscription: {
        type: channel,
        ...params
      }
    }
    
    if (websocket != null && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(unsubscribeMessage))
    }
    
    websocketSubscriptions.delete(subscriptionKey)
  }
}

/**
 * Subscribe to user state updates via WebSocket
 */
// Cache for the last known good state for each user
// Note: Currently not used, but kept for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userStateCache: Record<string, FetchedClearinghouseState> = {}

export const subscribeToUserState = async (address: string, onUpdate: (accountState?: AccountState) => void): Promise<() => void> => {
  if (!address) {
    console.error('No address provided to subscribeToUserState')
    return () => {} // Return empty unsubscribe function
  }

  console.log(`Setting up subscription for address: ${address}`)
  
  // Step 1: Fetch initial data first to ensure we have complete state
  try {
    console.log(`Fetching initial data for ${address}`)
    const initialData = await fetchClearinghouseState(address)
    if (initialData) {
      console.log(`Initial data received for ${address}`)
      onUpdate(initialData)
    }
  } catch (error) {
    console.error('Error fetching initial user data:', error)
  }
  
  // Step 2: Ensure WebSocket is connected before subscribing
  if (websocket == null || websocket.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not connected, initializing...')
    await initializeWebSocket()
  }
  
  // Format the address for the API
  const formattedAddress = address.toLowerCase()
  console.log(`Subscribing to user state updates for address: ${formattedAddress}`)
  
  // Process the user data directly from WebSocket
  const processUserData = (rawWsData: unknown) => {
    console.log('processUserData called with data:', rawWsData)
    try {
      // Try to parse as asWsWebData2, preferred as it contains all the data
      console.log('Attempting to clean as asWsWebdata2...')
      const websocketUserData = asWsWebdata2(rawWsData)
      console.log('Successfully cleaned with asWsWebdata2:')
      
      // Extract data based on the format received
      // We need to handle two possible formats:
      // 1. Direct data with crossMarginSummary, withdrawable, assetPositions at the top level
      // 2. Nested data where these fields are inside clearinghouseState
      
      // First, try to extract data from the nested clearinghouseState if it exists
      if (websocketUserData.clearinghouseState != null) {
        console.log('Processing webData2 format with nested clearinghouseState')
        processWsClearinghouseData(websocketUserData.clearinghouseState)
        return
      }
      
      // If we get here, try processing the top-level data
      console.log('No nested clearinghouseState found, trying to process top-level data')
      if (websocketUserData.crossMarginSummary || websocketUserData.assetPositions || websocketUserData.withdrawable) {
        console.log('Found top-level data fields, processing as WsClearinghouseState')
        processWsClearinghouseData(websocketUserData)
        return
      }
      
      console.log('No recognizable data structure found in WebSocket message')
    } catch (error) {
      console.error('Error processing WebSocket data:', error)
      console.error('Invalid data format received:', rawWsData)
      
      // Try parsing as a different structure as fallback
      try {
        console.log('Attempting direct access to data fields...')
        const data = rawWsData as any
        if (data && (data.crossMarginSummary || data.assetPositions || data.withdrawable || 
                    (data.clearinghouseState && (data.clearinghouseState.crossMarginSummary || 
                                               data.clearinghouseState.assetPositions || 
                                               data.clearinghouseState.withdrawable)))) {
          console.log('Found usable data without type validation, attempting to process')
          
          // Try to process the clearinghouseState if it exists
          if (data.clearinghouseState) {
            processWsClearinghouseData(data.clearinghouseState)
            return
          }
          
          // Otherwise try to process the top-level data
          processWsClearinghouseData(data)
        }
      } catch (fallbackError) {
        console.error('Fallback processing also failed:', fallbackError)
      }
    }
  }
  
  // Helper function to convert WebSocket data to AccountState
  const processWsClearinghouseData = (processedData: WsClearinghouseState) => {
    try {
      // Count positions if available for logging
      let positionCount = 0
      if (Array.isArray(processedData.assetPositions)) {
        positionCount = processedData.assetPositions.length
        console.log('Found', positionCount, 'positions')
      } else {
        console.log('No positions found in data')
      }
      
      // Create a complete UserState object from the WebSocket data
      const accountState: AccountState = {
        assetPositions: processedData.assetPositions ?? [],
        crossMarginSummary: processedData.crossMarginSummary ?? {
          accountValue: '0',
          totalMarginUsed: '0',
          totalNtlPos: '0',
          totalRawUsd: '0',
          leverage: '0'
        },
        marginSummary: undefined,// processedData.marginSummary, // TODO
        crossMaintenanceMarginUsed: undefined, // Not provided in WebSocket data
        withdrawable: processedData.withdrawable,
      }
      
      console.log('processWsClearinghouseData:', accountState)
      
      // Call the callback with the processed data
      onUpdate(accountState)
    } catch (error) {
      console.error('Error processing user state data:', error)
      console.error('Invalid data format:', processedData)
    }
  }
  
  // Create subscription for WebData2 which contains aggregate user information
  const webData2Key = `webData2:{"user":"${formattedAddress}"}`
  
  // Register the callback for webData2
  websocketSubscriptions.set(webData2Key, processUserData)
  
  console.log('Setting up subscription with key:', webData2Key)
  
  // Send subscription request for WebData2
  const webData2Message = {
    method: 'subscribe',
    subscription: {
      type: 'webData2',
      user: formattedAddress
    }
  }
  
  // We only need webData2 subscription now
  
  // Send subscription request if WebSocket is connected
  if (websocket != null && websocket.readyState === WebSocket.OPEN) {
    try {
      console.log('Sending webData2 subscription request for address:', formattedAddress)
      console.log('Subscription message:', webData2Message)
      websocket.send(JSON.stringify(webData2Message))
      console.log('Sent webData2 subscription request successfully')
    } catch (error) {
      console.error('Error sending subscription request:', error)
    }
  } else { 
    console.error('WebSocket not connected, subscription request not sent. State:', websocket?.readyState)
  }
  
  // Return unsubscribe function
  return () => {
    console.log(`Unsubscribing from user state for ${formattedAddress}`)
    
    if (websocket != null && websocket.readyState === WebSocket.OPEN) {
      // Unsubscribe from webData2
      websocket.send(JSON.stringify({
        method: 'unsubscribe',
        subscription: {
          type: 'webData2',
          user: formattedAddress
        }
      }))
    }
    
    // Clean up subscription from the map
    websocketSubscriptions.delete(webData2Key)
    
    console.log(`User subscription cleanup completed for ${formattedAddress}`)
  }
}

/**
 * Subscribe to market updates via WebSocket
 */
export const subscribeToMarkets = async <T>(callback: (data: T) => void): Promise<() => void> => {
  return subscribeToChannel<T>('allMeta', {}, callback)
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

    if (response.ok === false) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching markets:', error)
    throw error
  }
}
