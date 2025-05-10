"use client"

import { useState } from 'react'
import { useWallet } from '@/context/WalletContext'
import { PositionProvider } from '@/context/PositionContext'
import { subscribeToUserState, subscribeToMidPrices } from '@/services/hyperliquidService'
import AccountSummary from '@/components/AccountSummary'
import PositionsTable from '@/components/PositionsTable'
import ChartView from '@/components/ChartView'
import { useAsyncEffect } from '@/hooks/useAsyncEffect'
import type { AccountState, AssetPosition } from '../types/hyperliquidTypes'
import { Card, Loader, Message } from '@/components/ui'
import { formatFiat, formatNumber, formatPercent } from '@/utils/formatters'

// Define type for column order to be shared with PositionsTable
export type ColumnConfig = {
  id: string
  label: string
  getValue: (position: any) => any
  renderCell: (position: any) => React.ReactNode
}

export default function MainView() {
  const { account } = useWallet()
  const [accountState, setAccountState] = useState<AccountState>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [midPrices, setMidPrices] = useState<Record<string, string>>({})
  const [hasMidPrices, setHasMidPrices] = useState(false)
  
  // Store column ordering to persist across renders
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  useAsyncEffect(
    async () => {
      if (account == null) return
      
      console.log('MainView: Account changed, initializing data')
      setIsLoading(true)
      setError(undefined)
      
      // Track cleanup functions
      const cleanupFunctions: Array<() => void> = []
      
      // Subscribe to mark prices
      try {
        const unsubscribeMidPrices = await subscribeToMidPrices((prices) => {
          // Check if we have real price data
          if (Object.keys(prices).length > 0) {
            // Get BTC price at component update time
            const btcPrice = prices['BTC'] || 'unavailable'
            
            console.log({
              event: 'mid_prices_component_update',
              timestamp: new Date().toISOString(),
              btc_price: btcPrice
            })
            
            // Create a fresh object to ensure React detects the state change
            const freshPrices = Object.assign({}, prices)
            
            // Update the UI state with the new prices
            setMidPrices(freshPrices)
            
            // Increment the key to force PositionsTable to completely re-render
            // setMidPricesKey(prev => prev + 1)
            
            // Set flag indicating we have mid prices
            setHasMidPrices(true)
          }
        })
        cleanupFunctions.push(unsubscribeMidPrices)
      } catch (error) {
        console.log({
          event: 'mid_prices_subscription_error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      try {
        // Use explicit typing for the callback parameter
        const unsubscribe = await subscribeToUserState(account, (newAccountState?: AccountState) => {
          if (newAccountState == null) {
            console.log('subscribeToUserState: No data received')
            return
          }

          console.log('Data update received!', newAccountState.assetPositions.length, 'positions')
          setIsLoading(false) // Turn off loading once we get data
          
          // No need to check for error in the new structure as it's not part of UserState
          
          // Log detailed information about the update
          // Log account details in a single structured object
          console.log({
            event: 'account_state_update',
            timestamp: new Date().toISOString(),
            account_value: formatFiat(newAccountState.crossMarginSummary?.accountValue || '0'),
            withdrawable: formatFiat(newAccountState.withdrawable || '0'),
            leverage: formatNumber(newAccountState.crossMarginSummary?.leverage || '0', 2) + 'x',
            position_count: newAccountState.assetPositions.length
          })
          
          setAccountState((prevAccountState?: AccountState) => {
            // If we have no positions in the update but have positions in the current state,
            // keep the current positions and only update the account values
            if (newAccountState.assetPositions.length === 0 && prevAccountState?.assetPositions != null && prevAccountState.assetPositions.length > 0) {
              console.log('Update returned empty positions, preserving current positions')
              return {
                ...newAccountState,
                assetPositions: prevAccountState.assetPositions
              }
            }
            
            // If we have positions in the update, or if we have no current positions,
            // check if anything has changed before updating
            const positionsChanged = JSON.stringify(newAccountState.assetPositions) !== JSON.stringify(prevAccountState?.assetPositions)
            const valuesChanged = 
              newAccountState.crossMarginSummary?.accountValue !== prevAccountState?.crossMarginSummary?.accountValue ||
              newAccountState.withdrawable !== prevAccountState?.withdrawable ||
              newAccountState.crossMarginSummary?.leverage !== prevAccountState?.crossMarginSummary?.leverage
            
            // Log what changed
            if (positionsChanged) {
              if (prevAccountState != null && newAccountState != null) {
                // Collect all position changes in a single object
                const allPositionChanges: Record<string, any> = {};
                const newPositions: Record<string, any> = {};
                
                newAccountState.assetPositions.forEach((newPos: AssetPosition) => {
                  const oldPos = prevAccountState.assetPositions.find((p: AssetPosition) => p.position.coin === newPos.position.coin)
                  if (oldPos != null) {
                    // Track changes for existing positions
                    const changes: Record<string, { from: any, to: any }> = {};
                    
                    if (newPos.position.szi !== oldPos.position.szi) {
                      changes.size = { 
                        from: formatNumber(oldPos.position.szi), 
                        to: formatNumber(newPos.position.szi) 
                      };
                    }
                    if (newPos.position.positionValue !== oldPos.position.positionValue) {
                      changes.value = { 
                        from: formatFiat(oldPos.position.positionValue), 
                        to: formatFiat(newPos.position.positionValue) 
                      };
                    }
                    if (newPos.position.unrealizedPnl !== oldPos.position.unrealizedPnl) {
                      changes.pnl = { 
                        from: formatFiat(oldPos.position.unrealizedPnl), 
                        to: formatFiat(newPos.position.unrealizedPnl) 
                      };
                    }
                    
                    // Only add if there are actual changes
                    if (Object.keys(changes).length > 0) {
                      allPositionChanges[newPos.position.coin] = changes;
                    }
                  } else {
                    // Track new positions
                    newPositions[newPos.position.coin] = {
                      size: formatNumber(newPos.position.szi),
                      value: formatFiat(newPos.position.positionValue),
                      pnl: formatFiat(newPos.position.unrealizedPnl)
                    };
                  }
                });
                
                // Log all position changes in a single consolidated object
                const hasChanges = Object.keys(allPositionChanges).length > 0;
                const hasNewPositions = Object.keys(newPositions).length > 0;
                
                if (hasChanges || hasNewPositions) {
                  console.log({
                    event: 'position_update',
                    timestamp: new Date().toISOString(),
                    changes: hasChanges ? allPositionChanges : 'none',
                    new_positions: hasNewPositions ? newPositions : 'none'
                  });
                }
              }
            }
            
            if (valuesChanged) {
              if (prevAccountState != null) {
                // Collect all changes into a single object
                const changes: Record<string, { from: any, to: any }> = {};
                
                if (newAccountState.crossMarginSummary?.accountValue !== prevAccountState.crossMarginSummary?.accountValue) {
                  changes.accountValue = { 
                    from: formatFiat(prevAccountState.crossMarginSummary?.accountValue || '0'), 
                    to: formatFiat(newAccountState.crossMarginSummary?.accountValue || '0') 
                  };
                }
                
                if (newAccountState.withdrawable !== prevAccountState.withdrawable) {
                  changes.withdrawable = { 
                    from: formatFiat(prevAccountState.withdrawable || '0'), 
                    to: formatFiat(newAccountState.withdrawable || '0') 
                  };
                }
                
                if (newAccountState.crossMarginSummary?.leverage !== prevAccountState.crossMarginSummary?.leverage) {
                  changes.leverage = { 
                    from: formatNumber(prevAccountState.crossMarginSummary?.leverage || '0', 2) + 'x', 
                    to: formatNumber(newAccountState.crossMarginSummary?.leverage || '0', 2) + 'x' 
                  };
                }
                
                // Log all changes at once
                if (Object.keys(changes).length > 0) {
                  console.log({
                    event: 'account_values_changed',
                    timestamp: new Date().toISOString(),
                    changes
                  });
                }
              }
            }
              
            if (positionsChanged || valuesChanged) {
              console.log({ event: 'balance_data_changed', action: 'updating_ui', timestamp: new Date().toISOString() });
              return newAccountState;
            } else {
              console.log({ event: 'balance_data_unchanged', timestamp: new Date().toISOString() });
              return prevAccountState;
            }
          });
        });
        
        // Add to cleanup functions
        cleanupFunctions.push(unsubscribe)
        
        // Return combined cleanup function
        return () => {
          cleanupFunctions.forEach(cleanup => cleanup())
        }
      } catch (error) {
        console.error('Error setting up WebSocket subscription:', error)
        setError('Failed to connect to Hyperliquid API. Please try again later.')
        setIsLoading(false)
      }
    }, 
    [account], 
    'hyperliquid-user-state'
  )

  return (
    <PositionProvider>
      <div className="space-y-6">
        {/* Account Overview Card */}
        <Card>
          <Card.Header>Account Overview</Card.Header>
          
          {isLoading && (
            <Loader label="Loading account data..." />
          )}
          
          {error != null && (
            <Message variant="error">
              {error}
            </Message>
          )}
          
          {accountState != null && isLoading === false && (
            <AccountSummary accountState={accountState} />
          )}
          
          {account == null && (
            <Message variant="warning">
              <p>Please connect your wallet to view your account data.</p>
            </Message>
          )}
        </Card>
        
        {/* Chart Card - Only show if account state is loaded */}
        {accountState != null && isLoading === false && (
          <Card>
            <Card.Header>Chart</Card.Header>
            <div className="h-[500px]">
              <ChartView />
            </div>
          </Card>
        )}
        
        {/* Positions Card - Only show if account state is loaded */}
        {accountState != null && isLoading === false && (
          <Card>
            <Card.Header>Positions</Card.Header>
            {hasMidPrices ? (
              <PositionsTable 
                positions={accountState.assetPositions} 
                midPrices={midPrices}
                columnOrder={columnOrder}
                onColumnOrderChange={(newOrder) => {
                  console.log({
                    event: 'column_order_saved',
                    timestamp: new Date().toISOString(),
                    column_count: newOrder.length
                  })
                  setColumnOrder(newOrder)
                }}
              />
            ) : (
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-sm text-gray-600">Loading market prices...</p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </PositionProvider>
  )
}
