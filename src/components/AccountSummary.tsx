"use client"

import type { AccountState } from '../types/hyperliquidTypes'
import { Panel } from '@/components/ui'
import { formatFiat, formatNumber } from '@/utils/formatters'

interface AccountSummaryProps {
  accountState: AccountState
}

export default function AccountSummary({ accountState }: AccountSummaryProps) {
  const accountValue = accountState.crossMarginSummary?.accountValue ?? '0';
  const withdrawable = accountState.withdrawable ?? '0';
  const leverage = accountState.crossMarginSummary?.leverage ?? '0';
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel variant="blue">
        <Panel.Label>Account Value</Panel.Label>
        <Panel.Value>{formatFiat(accountValue)}</Panel.Value>
      </Panel>
      
      <Panel variant="green">
        <Panel.Label>Withdrawable</Panel.Label>
        <Panel.Value>{formatFiat(withdrawable)}</Panel.Value>
      </Panel>
      
      <Panel variant="yellow">
        <Panel.Label>Leverage</Panel.Label>
        <Panel.Value>{formatNumber(leverage, 2)}x</Panel.Value>
      </Panel>
    </div>
  )
}
