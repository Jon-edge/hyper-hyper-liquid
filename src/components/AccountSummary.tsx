"use client"

import type { AccountState } from '../types/hyperliquidTypes'
import { Panel } from '@/components/ui'
import { formatFiat, formatNumber, formatPercent } from '@/utils/formatters'
import { useWallet } from '@/context/WalletContext'

interface AccountSummaryProps {
  accountState: AccountState
}

export default function AccountSummary({ accountState }: AccountSummaryProps) {
  const { hideInfo } = useWallet()
  
  // Extract base values
  const accountValue = accountState.crossMarginSummary?.accountValue ?? '0';
  const withdrawable = accountState.withdrawable ?? '0';
  const totalNtlPos = accountState.crossMarginSummary?.totalNtlPos ?? '0';
  const totalMarginUsed = accountState.crossMarginSummary?.totalMarginUsed ?? '0';
  const maintenanceMargin = accountState.crossMaintenanceMarginUsed ?? '0';
  
  // Calculate cross margin ratio (maintenance margin / portfolio value) according to Hyperliquid
  const accountValueNum = parseFloat(accountValue);
  const maintenanceMarginNum = parseFloat(maintenanceMargin);
  const crossMarginRatio = accountValueNum > 0 ? (maintenanceMarginNum / accountValueNum) * 100 : 0;
  
  // Calculate cross account leverage (total notional position / account value)
  const totalNtlPosNum = parseFloat(totalNtlPos);
  const crossAccountLeverage = accountValueNum > 0 ? totalNtlPosNum / accountValueNum : 0;
  
  // Calculate total unrealized PNL
  let totalUnrealizedPnl = 0;
  if (accountState.assetPositions && accountState.assetPositions.length > 0) {
    totalUnrealizedPnl = accountState.assetPositions.reduce((total, position) => {
      const pnl = parseFloat(position.position.unrealizedPnl || '0');
      return total + pnl;
    }, 0);
  }
  
  // Log calculations for debugging
  console.log({
    event: 'account_metrics_calculated',
    timestamp: new Date().toISOString(),
    accountValue: accountValueNum,
    totalMarginUsed,
    maintenanceMargin: maintenanceMarginNum,
    totalNtlPos: totalNtlPosNum,
    crossMarginRatio,
    crossAccountLeverage,
    totalUnrealizedPnl
  });
  
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
}
