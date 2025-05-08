"use client"

import { useState, useEffect } from 'react'
import { useWallet } from '@/context/WalletContext'
import { 
  fetchUserState, 
  subscribeToUserState,
  UserState 
} from '@/services/hyperliquidService'
import AccountSummary from './AccountSummary'
import PositionsTable from './PositionsTable'

export default function MainView() {
  const { account } = useWallet()
  const [balance, setBalance] = useState<UserState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!account) return

    console.log('UserStateView: Account changed, setting up data fetching')
    setLoading(true)
    setError(null)
    
    // Track WebSocket subscription for cleanup
    let unsubscribe: (() => void) | null = null
    
    // Setup WebSocket for real-time updates
    const setupWebSocket = async () => {
      try {
        console.log('Setting up WebSocket subscription for account updates...')
        unsubscribe = await subscribeToUserState(account, (wsData) => {
          console.log('WebSocket update received!', wsData.positions.length, 'positions')
          
          // Log detailed information about the update
          console.log('WebSocket update details:')
          console.log('- Account Value:', wsData.accountValue)
          console.log('- Withdrawable:', wsData.withdrawable)
          console.log('- Leverage:', wsData.leverage)
          console.log('- Position count:', wsData.positions.length)
          
          setBalance((prevBalance) => {
            // If we have no positions in the update but have positions in the current state,
            // keep the current positions and only update the account values
            if (wsData.positions.length === 0 && prevBalance?.positions && prevBalance.positions.length > 0) {
              console.log('WebSocket returned empty positions, preserving current positions')
              return {
                ...wsData,
                positions: prevBalance.positions
              }
            }
            
            // If we have positions in the update, or if we have no current positions,
            // check if anything has changed before updating
            const positionsChanged = JSON.stringify(wsData.positions) !== JSON.stringify(prevBalance?.positions)
            const valuesChanged = 
              wsData.accountValue !== prevBalance?.accountValue ||
              wsData.withdrawable !== prevBalance?.withdrawable ||
              wsData.leverage !== prevBalance?.leverage
            
            // Log what changed
            if (positionsChanged) {
              console.log('Positions changed!')
              // Find which position changed
              if (prevBalance?.positions) {
                wsData.positions.forEach((newPos, index) => {
                  const oldPos = prevBalance.positions.find((p) => p.coin === newPos.coin)
                  if (oldPos) {
                    if (newPos.size !== oldPos.size) {
                      console.log(`Position ${newPos.coin} size changed: ${oldPos.size} -> ${newPos.size}`)
                    }
                    if (newPos.value !== oldPos.value) {
                      console.log(`Position ${newPos.coin} value changed: ${oldPos.value} -> ${newPos.value}`)
                    }
                    if (newPos.unrealizedPnl !== oldPos.unrealizedPnl) {
                      console.log(`Position ${newPos.coin} PnL changed: ${oldPos.unrealizedPnl} -> ${newPos.unrealizedPnl}`)
                    }
                  } else {
                    console.log(`New position added: ${newPos.coin}`)
                  }
                })
              }
            }
            
            if (valuesChanged) {
              console.log('Account values changed!')
              if (prevBalance) {
                if (wsData.accountValue !== prevBalance.accountValue) {
                  console.log(`Account value changed: ${prevBalance.accountValue} -> ${wsData.accountValue}`)
                }
                if (wsData.withdrawable !== prevBalance.withdrawable) {
                  console.log(`Withdrawable changed: ${prevBalance.withdrawable} -> ${wsData.withdrawable}`)
                }
                if (wsData.leverage !== prevBalance.leverage) {
                  console.log(`Leverage changed: ${prevBalance.leverage} -> ${wsData.leverage}`)
                }
              }
            }
              
            if (positionsChanged || valuesChanged) {
              console.log('Balance data changed, updating UI')
              return wsData
            } else {
              console.log('No changes in balance data')
              return prevBalance
            }
          })
        })
      } catch (err) {
        console.error('Error setting up WebSocket subscription:', err)
      }
    }
    
    // Initial fetch using REST API
    const fetchInitialData = async () => {
      try {
        console.log('Fetching initial account data...')
        const data = await fetchUserState(account)
        
        // Check if there was an error returned from the service
        if ('error' in data) {
          setError(`Failed to fetch account balance: ${data.error}`)
          console.error('Error in account data:', data.error)
        } else {
          console.log(`Initial data loaded: ${data.positions.length} positions`)
          setBalance(data)
          
          // Now that we have initial data, set up the WebSocket connection
          setupWebSocket()
        }
      } catch (err) {
        setError('Failed to fetch account balance. Please try again.')
        console.error('Error fetching balance:', err)
      } finally {
        setLoading(false)
      }
    }

    // Start with initial data load
    fetchInitialData()
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('Cleaning up WebSocket subscription')
        unsubscribe()
      }
    }
  }, [account])

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Account Overview</h2>
      
      {loading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading account data...</span>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {balance && !loading && (
        <div className="space-y-4">
          <AccountSummary userState={balance} />
          <PositionsTable positions={balance.positions} />
        </div>
      )}
      
      {!account && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-gray-700">Please connect your wallet to view your account balance.</p>
        </div>
      )}
    </div>
  )
}
