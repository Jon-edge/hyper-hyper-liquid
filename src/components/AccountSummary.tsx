"use client"

import type { AccountState } from '../types/hyperliquidTypes'
import { Panel } from '@/components/ui'

interface AccountSummaryProps {
  accountState: AccountState
}

export default function AccountSummary({ accountState }: AccountSummaryProps) {
  const accountValue = parseFloat(accountState.crossMarginSummary?.accountValue ?? '0').toFixed(2);
  const withdrawable = parseFloat(accountState.withdrawable ?? '0').toFixed(2);
  const leverage = parseFloat(accountState.crossMarginSummary?.leverage ?? '0').toFixed(2);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel variant="blue">
        <Panel.Label>Account Value</Panel.Label>
        <Panel.Value>${accountValue}</Panel.Value>
      </Panel>
      
      <Panel variant="green">
        <Panel.Label>Withdrawable</Panel.Label>
        <Panel.Value>${withdrawable}</Panel.Value>
      </Panel>
      
      <Panel variant="yellow">
        <Panel.Label>Leverage</Panel.Label>
        <Panel.Value>{leverage}x</Panel.Value>
      </Panel>
    </div>
  )
}
