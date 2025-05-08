"use client"

import { useEffect, useState } from 'react'
import { WebSocketStatus, onWebSocketStatusChange, initializeWebSocket } from '@/services/hyperliquidService'

export default function WebSocketStatusIndicator() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  
  useEffect(() => {
    // Initialize WebSocket connection when component mounts
    initializeWebSocket().catch(err => {
      console.error('Failed to initialize WebSocket:', err)
    })
    
    // Subscribe to status changes
    const unsubscribe = onWebSocketStatusChange((newStatus) => {
      setStatus(newStatus)
    })
    
    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [])
  
  // Determine indicator color based on status
  const getIndicatorColor = () => {
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
      <div className="flex items-center space-x-1 mr-2">
        <div className={`w-3 h-3 rounded-full ${getIndicatorColor()}`}></div>
      </div>
      <span className="text-xs text-gray-600">{getStatusText()}</span>
    </div>
  )
}
