"use client"

import React, { useEffect, useState } from 'react'
import type { AccountState } from '../types/hyperliquidTypes'
import { Panel } from '@/components/ui'
import { formatFiat, formatNumber, formatPercent } from '@/utils/formatters'
import { useWallet } from '@/context/WalletContext'

interface AccountSummaryProps {
  accountState: AccountState
}

const AccountSummary = React.memo(({ accountState }: AccountSummaryProps) => {
  const { hideInfo } = useWallet()
  
  // Create state for all the values we need to display
  const [accountValue, setAccountValue] = useState('0')
  const [withdrawable, setWithdrawable] = useState('0')
  const [totalNtlPos, setTotalNtlPos] = useState('0')
  const [maintenanceMargin, setMaintenanceMargin] = useState('0')
  const [crossMarginRatio, setCrossMarginRatio] = useState(0)
  const [crossAccountLeverage, setCrossAccountLeverage] = useState(0)
  const [totalUnrealizedPnl, setTotalUnrealizedPnl] = useState(0)
  
  // Update all values when accountState changes
  useEffect(() => {
    if (!accountState) return
    
    // Extract base values
    const newAccountValue = accountState.crossMarginSummary?.accountValue ?? '0'
    const newWithdrawable = accountState.withdrawable ?? '0'
    const newTotalNtlPos = accountState.crossMarginSummary?.totalNtlPos ?? '0'
    
    // Debug the maintenance margin value - it might be missing in updates
    console.log({
      event: 'maintenance_margin_debug',
      timestamp: new Date().toISOString(),
      crossMaintenanceMarginUsed: accountState.crossMaintenanceMarginUsed,
      rawAccountState: accountState
    })
    
    // Preserve the maintenance margin value if it's missing in the update
    // This fixes the issue where CrossMarginRatio becomes 0 after initial value
    const newMaintenanceMargin = accountState.crossMaintenanceMarginUsed || maintenanceMargin || '0'
    
    // Calculate cross margin ratio (maintenance margin / portfolio value) according to Hyperliquid
    const accountValueNum = parseFloat(newAccountValue)
    const maintenanceMarginNum = parseFloat(newMaintenanceMargin)
    const newCrossMarginRatio = accountValueNum > 0 ? (maintenanceMarginNum / accountValueNum) * 100 : 0
    
    // Calculate cross account leverage (total notional position / account value)
    const totalNtlPosNum = parseFloat(newTotalNtlPos)
    const newCrossAccountLeverage = accountValueNum > 0 ? totalNtlPosNum / accountValueNum : 0
    
    // Calculate total unrealized PNL
    let newTotalUnrealizedPnl = 0
    if (accountState.assetPositions && accountState.assetPositions.length > 0) {
      newTotalUnrealizedPnl = accountState.assetPositions.reduce((total, position) => {
        const pnl = parseFloat(position.position.unrealizedPnl ?? '0')
        return total + pnl
      }, 0)
    }
    
    // Update all state values
    setAccountValue(newAccountValue)
    setWithdrawable(newWithdrawable)
    setTotalNtlPos(newTotalNtlPos)
    setMaintenanceMargin(newMaintenanceMargin)
    setCrossMarginRatio(newCrossMarginRatio)
    setCrossAccountLeverage(newCrossAccountLeverage)
    setTotalUnrealizedPnl(newTotalUnrealizedPnl)
    
    // Log calculations for debugging
    console.log({
      event: 'account_metrics_calculated',
      timestamp: new Date().toISOString(),
      accountValue: newAccountValue,
      withdrawable: newWithdrawable,
      maintenanceMargin: newMaintenanceMargin,
      totalNtlPos: newTotalNtlPos,
      crossMarginRatio: newCrossMarginRatio,
      crossAccountLeverage: newCrossAccountLeverage,
      totalUnrealizedPnl: newTotalUnrealizedPnl
    })
  }, [accountState]) // Re-run when accountState changes
  
  // Component is now using React.memo and useEffect to update when accountState changes
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* First row */}
      <Panel variant="blue">
        <Panel.Label>Account Value</Panel.Label>
        <Panel.Value>
          {formatFiat(accountValue, true, undefined, false, true, hideInfo)}
        </Panel.Value>
      </Panel>
      
      <Panel variant="green">
        <Panel.Label>Withdrawable</Panel.Label>
        <Panel.Value>
          {formatFiat(withdrawable, true, undefined, false, true, hideInfo)}
        </Panel.Value>
      </Panel>
      
      <Panel variant="purple">
        <Panel.Label>Total Unrealized PNL</Panel.Label>
        <Panel.Value positive={totalUnrealizedPnl >= 0} negative={totalUnrealizedPnl < 0}>
          {formatFiat(totalUnrealizedPnl, true, undefined, false, true, hideInfo)}
        </Panel.Value>
      </Panel>

      {/* Second row */}
      <Panel variant="yellow">
        <Panel.Label>Cross Account Leverage</Panel.Label>
        <Panel.Value>
          {/* Leverage is not sensitive information */}
          {`${formatNumber(crossAccountLeverage, 2)}x`}
        </Panel.Value>
      </Panel>
      
      <Panel variant="orange">
        <Panel.Label>Cross Margin Ratio</Panel.Label>
        <Panel.Value>
          {formatPercent(crossMarginRatio)}
        </Panel.Value>
      </Panel>
      
      <Panel variant="gray">
        <Panel.Label>Total Notional Position</Panel.Label>
        <Panel.Value>
          {formatFiat(totalNtlPos, true, undefined, false, true, hideInfo)}
        </Panel.Value>
      </Panel>
    </div>
  )
})

export default AccountSummary
