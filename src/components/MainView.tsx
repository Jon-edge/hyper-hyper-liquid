"use client"

import { useState } from 'react'
import { useWallet } from '@/context/WalletContext'
import { subscribeToUserState } from '@/services/hyperliquidService'
import AccountSummary from '@/components/AccountSummary'
import PositionsTable from '@/components/PositionsTable'
import { useAsyncEffect } from '@/hooks/useAsyncEffect'
import type { AccountState, AssetPosition } from '../types/hyperliquidTypes'
import { Card, Loader, Message } from '@/components/ui'

export default function MainView() {
  const { account } = useWallet()
  const [accountState, setAccountState] = useState<AccountState>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  useAsyncEffect(async () => {
    if (account == null) return
    
    console.log('MainView: Account changed, initializing data')
    setIsLoading(true)
    setError(undefined)
    
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
        console.log('Update details:')
        console.log('- Account Value:', newAccountState.crossMarginSummary?.accountValue)
        console.log('- Withdrawable:', newAccountState.withdrawable)
        console.log('- Leverage:', newAccountState.crossMarginSummary?.leverage)
        console.log('- Position count:', newAccountState.assetPositions.length)
        
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
            console.log('Positions changed!')
            // Find which position changed
            if (prevAccountState?.assetPositions != null) {
              newAccountState.assetPositions.forEach((newPos: AssetPosition) => {
                const oldPos = prevAccountState.assetPositions.find((p: AssetPosition) => p.position.coin === newPos.position.coin)
                if (oldPos != null) {
                  if (newPos.position.szi !== oldPos.position.szi) {
                    console.log(`Position ${newPos.position.coin} size changed: ${oldPos.position.szi} -> ${newPos.position.szi}`)
                  }
                  if (newPos.position.positionValue !== oldPos.position.positionValue) {
                    console.log(`Position ${newPos.position.coin} value changed: ${oldPos.position.positionValue} -> ${newPos.position.positionValue}`)
                  }
                  if (newPos.position.unrealizedPnl !== oldPos.position.unrealizedPnl) {
                    console.log(`Position ${newPos.position.coin} PnL changed: ${oldPos.position.unrealizedPnl} -> ${newPos.position.unrealizedPnl}`)
                  }
                } else {
                  console.log(`New position added: ${newPos.position.coin}`)
                }
              })
            }
          }
          
          if (valuesChanged) {
            console.log('Account values changed!')
            if (prevAccountState != null) {
              if (newAccountState.crossMarginSummary?.accountValue !== prevAccountState.crossMarginSummary?.accountValue) {
                console.log(`Account value changed: ${prevAccountState.crossMarginSummary?.accountValue} -> ${newAccountState.crossMarginSummary?.accountValue}`)
              }
              if (newAccountState.withdrawable !== prevAccountState.withdrawable) {
                console.log(`Withdrawable changed: ${prevAccountState.withdrawable} -> ${newAccountState.withdrawable}`)
              }
              if (newAccountState.crossMarginSummary?.leverage !== prevAccountState.crossMarginSummary?.leverage) {
                console.log(`Leverage changed: ${prevAccountState.crossMarginSummary?.leverage} -> ${newAccountState.crossMarginSummary?.leverage}`)
              }
            }
          }
            
          if (positionsChanged || valuesChanged) {
            console.log('Balance data changed, updating UI')
            return newAccountState
          } else {
            console.log('No changes in balance data')
            return prevAccountState
          }
        })
      })
      
      // Return cleanup function
      return () => {
        if (unsubscribe != null) {
          console.log('Cleaning up WebSocket subscription')
          unsubscribe()
        }
      }
    } catch (err) {
      setError('Failed to set up data connection. Please try again.')
      console.error('Error setting up WebSocket subscription:', err)
      setIsLoading(false)
    }
  }, [account], 'hyperliquid-user-state')

  return (
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
        <div className="space-y-4">
          <AccountSummary accountState={accountState} />
          <PositionsTable positions={accountState.assetPositions} />
        </div>
      )}
      
      {account == null && (
        <Message variant="warning">
          <p>Please connect your wallet to view your account data.</p>
        </Message>
      )}
    </Card>
  )
}
