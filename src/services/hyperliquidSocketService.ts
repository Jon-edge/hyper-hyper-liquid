// Hyperliquid WebSocket service with event emitter pattern
import { EventEmitter } from 'events'
import {
  getHyperliquidWebSocketUrl,
  createMidPricesSubscription,
  processMidPricesMessage,
  createPingMessage,
  isPongMessage
} from './hyperliquidService'

// Events that can be emitted by the service
export enum HyperliquidEvents {
  PRICES_UPDATED = 'prices_updated',
  CONNECTION_STATUS_CHANGED = 'connection_status_changed',
  PONG_RECEIVED = 'pong_received'
}

// Connection status types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Singleton service to manage Hyperliquid WebSocket connection
 * Uses event emitter pattern to broadcast updates.
 * 
 * For browser-specific concerns.
 */
class HyperliquidSocketService {
  private static instance: HyperliquidSocketService
  private emitter: EventEmitter
  private ws: WebSocket | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts: number = 0
  private readonly MAX_RECONNECT_ATTEMPTS = 10
  private readonly RECONNECT_INTERVAL = 3000 // ms
  private readonly PING_INTERVAL = 30000 // ms
  
  // Status tracking
  private prices: Record<string, string> = {}
  private connectionStatus: ConnectionStatus = 'disconnected'
  private lastPongTime: number | null = null
  private listenerCounts: Record<string, number> = {}
  
  // Private constructor for singleton
  private constructor() {
    this.emitter = new EventEmitter()
    // Increase max listeners to avoid warnings
    this.emitter.setMaxListeners(50)
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): HyperliquidSocketService {
    if (HyperliquidSocketService.instance == null) {
      HyperliquidSocketService.instance = new HyperliquidSocketService()
    }
    return HyperliquidSocketService.instance
  }
  
  /**
   * Initialize WebSocket connection if not already connected
   */
  public connect(): void {
    // Only connect in browser environment
    if (typeof window === 'undefined') {
      console.log('Cannot connect WebSocket in server environment')
      return
    }
    
    // Don't reconnect if already connected or connecting
    if (this.ws != null) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket already connected or connecting')
        return
      }
    }
    
    // Update status
    this.setConnectionStatus('connecting')
    
    // Create new WebSocket
    this.ws = new WebSocket(getHyperliquidWebSocketUrl())
    
    // Set event handlers
    this.ws.onopen = this.handleOpen.bind(this)
    this.ws.onclose = this.handleClose.bind(this)
    this.ws.onerror = this.handleError.bind(this)
    this.ws.onmessage = this.handleMessage.bind(this)
    
    console.log('Hyperliquid WebSocket connecting...')
  }
  
  /**
   * Disconnect WebSocket if connected
   */
  public disconnect(): void {
    if (this.ws != null) {
      // Clear intervals and timeouts
      this.clearTimers()
      
      // Only try to close if it's not already closed
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      
      this.ws = null
      this.setConnectionStatus('disconnected')
      console.log('Hyperliquid WebSocket disconnected')
    }
  }
  
  /**
   * Send message to WebSocket if connected
   */
  private sendMessage(message: string): boolean {
    if (this.ws != null && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message)
        return true
      } catch (error) {
        console.error('Error sending message to WebSocket:', error)
        return false
      }
    }
    return false
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('Hyperliquid WebSocket connected')
    this.setConnectionStatus('connected')
    this.reconnectAttempts = 0
    
    // Subscribe to mid prices
    this.sendMessage(createMidPricesSubscription())
    
    // Setup ping interval
    this.setupPingInterval()
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`Hyperliquid WebSocket closed: ${event.code} ${event.reason}`)
    this.setConnectionStatus('disconnected')
    
    // Clear intervals
    this.clearTimers()
    
    // Attempt to reconnect if we have listeners
    if (this.hasActiveListeners() && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++
      const delay = this.RECONNECT_INTERVAL * Math.min(2, this.reconnectAttempts / 3)
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`)
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect()
      }, delay)
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('Hyperliquid WebSocket error:', event)
    this.setConnectionStatus('error')
  }
  
  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data != null) {
      try {
        // Check if it's a pong message
        if (isPongMessage(event.data)) {
          this.lastPongTime = Date.now()
          this.emitter.emit(HyperliquidEvents.PONG_RECEIVED, this.lastPongTime)
          return
        }
        
        // Process mid prices message
        const prices = processMidPricesMessage(event.data)
        if (Object.keys(prices).length > 0) {
          this.prices = prices
          this.emitter.emit(HyperliquidEvents.PRICES_UPDATED, prices)
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }
  }
  
  /**
   * Setup ping interval to keep connection alive
   */
  private setupPingInterval(): void {
    // Clear existing interval if any
    if (this.pingInterval != null) {
      clearInterval(this.pingInterval)
    }
    
    // Create new interval
    this.pingInterval = setInterval(() => {
      this.sendMessage(createPingMessage())
    }, this.PING_INTERVAL)
  }
  
  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.pingInterval != null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    if (this.reconnectTimeout != null) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }
  
  /**
   * Set connection status and emit event
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status
    this.emitter.emit(HyperliquidEvents.CONNECTION_STATUS_CHANGED, status)
  }
  
  /**
   * Check if we have any active listeners
   */
  private hasActiveListeners(): boolean {
    return (
      this.listenerCounts[HyperliquidEvents.PRICES_UPDATED] > 0 ||
      this.listenerCounts[HyperliquidEvents.CONNECTION_STATUS_CHANGED] > 0
    )
  }
  
  /**
   * Track listener counts to auto-connect/disconnect when needed
   */
  private trackListenerCount(event: string, increment: boolean): void {
    if (this.listenerCounts[event] == null) {
      this.listenerCounts[event] = 0
    }
    
    if (increment) {
      this.listenerCounts[event]++
      
      // Auto-connect when first listener is added
      if (this.hasActiveListeners() && this.ws == null) {
        this.connect()
      }
    } else {
      this.listenerCounts[event]--
      if (this.listenerCounts[event] < 0) {
        this.listenerCounts[event] = 0
      }
      
      // Auto-disconnect when no more listeners
      if (!this.hasActiveListeners() && this.ws != null) {
        this.disconnect()
      }
    }
  }
  
  /**
   * Subscribe to price updates
   * @returns An unsubscribe function
   */
  public subscribeToMidPrices(callback: (prices: Record<string, string>) => void): () => void {
    // Add listener
    this.emitter.on(HyperliquidEvents.PRICES_UPDATED, callback)
    this.trackListenerCount(HyperliquidEvents.PRICES_UPDATED, true)
    
    // Call with current data immediately
    if (Object.keys(this.prices).length > 0) {
      callback({ ...this.prices })
    }
    
    // Return unsubscribe function
    return () => {
      this.emitter.off(HyperliquidEvents.PRICES_UPDATED, callback)
      this.trackListenerCount(HyperliquidEvents.PRICES_UPDATED, false)
    }
  }
  
  /**
   * Subscribe to connection status updates
   * @returns An unsubscribe function
   */
  public subscribeToConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
    // Add listener
    this.emitter.on(HyperliquidEvents.CONNECTION_STATUS_CHANGED, callback)
    this.trackListenerCount(HyperliquidEvents.CONNECTION_STATUS_CHANGED, true)
    
    // Call with current status immediately
    callback(this.connectionStatus)
    
    // Return unsubscribe function
    return () => {
      this.emitter.off(HyperliquidEvents.CONNECTION_STATUS_CHANGED, callback)
      this.trackListenerCount(HyperliquidEvents.CONNECTION_STATUS_CHANGED, false)
    }
  }
  
  /**
   * Subscribe to pong events
   * @returns An unsubscribe function
   */
  public subscribeToPongEvents(callback: (timestamp: number) => void): () => void {
    // Add listener
    this.emitter.on(HyperliquidEvents.PONG_RECEIVED, callback)
    
    // Call with current timestamp immediately if we have one
    if (this.lastPongTime != null) {
      callback(this.lastPongTime)
    }
    
    // Return unsubscribe function
    return () => {
      this.emitter.off(HyperliquidEvents.PONG_RECEIVED, callback)
    }
  }
  
  /**
   * Get current prices
   */
  public getPrices(): Record<string, string> {
    return { ...this.prices }
  }
  
  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }
  
  /**
   * Get last pong time
   */
  public getLastPongTime(): number | null {
    return this.lastPongTime
  }
}

// Export singleton instance
export const hyperliquidSocketService = HyperliquidSocketService.getInstance()
