"use client"

import { useEffect, useState } from 'react'
import { WebSocketStatus, onWebSocketStatusChange, initializeWebSocket, onWebSocketMessage } from '@/services/hyperliquidService'

export default function WebSocketStatusIndicator() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [isPulsing, setIsPulsing] = useState(false)
  
  useEffect(() => {
    // Initialize WebSocket connection when component mounts
    initializeWebSocket().catch(err => {
      console.error('Failed to initialize WebSocket:', err)
    })
    
    // Subscribe to status changes
    const statusUnsubscribe = onWebSocketStatusChange((newStatus) => {
      setStatus(newStatus)
    })
    
    return () => {
      statusUnsubscribe()
    }
  }, []) // Only run once on mount
  
  // Separate effect for message pulse animation
  useEffect(() => {
    // Subscribe to message events to trigger pulse animation
    const messageUnsubscribe = onWebSocketMessage(() => {
      // Only pulse if we're connected
      if (status === 'connected') {
        // Prevent multiple pulse animations overlapping
        setIsPulsing(false)  // Reset first to ensure animation retriggers
        
        // Use requestAnimationFrame to ensure the false state is processed
        requestAnimationFrame(() => {
          setIsPulsing(true)  // Start the pulse
          
          // Reset after animation completes
          setTimeout(() => {
            setIsPulsing(false)
          }, 300)  // Quick pulse duration (300ms)
        })
      }
    })
    
    return () => {
      messageUnsubscribe()
    }
  }, [status])  // Re-subscribe when status changes
  
  // Determine indicator color based on status and pulsing state
  const getIndicatorColor = () => {
    // Only use lighter green when connected and pulsing
    if (status === 'connected' && isPulsing) {
      return 'bg-green-200' // Even lighter green for pulse when receiving messages
    }
    
    // Normal status colors
    switch (status) {
      case 'connected':
        return 'bg-green-500' // Green for connected
      case 'connecting':
        return 'bg-yellow-500' // Yellow for connecting
      case 'error':
        return 'bg-red-500' // Red for error
      case 'disconnected':
      default:
        return 'bg-gray-500' // Gray for disconnected
    }
  }
  
  // Determine status text
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      case 'disconnected':
      default:
        return 'Disconnected'
    }
  }
  
  return (
    <div className="flex items-center">
      {/* Fixed-size container to prevent layout shifts */}
      <div className="flex items-center justify-center w-5 h-5 mr-2">
        <div 
          className={`rounded-full transition-all duration-500 ${getIndicatorColor()} ${isPulsing ? 'w-4 h-4' : 'w-3 h-3'}`}
        ></div>
      </div>
      <span className="text-xs text-gray-600">{getStatusText()}</span>
    </div>
  )
}
