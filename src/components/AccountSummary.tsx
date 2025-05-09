"use client"

import type { AccountState } from '../types/hyperliquidTypes'

interface AccountSummaryProps {
  accountState: AccountState
}

export default function AccountSummary({ accountState }: AccountSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-500">Account Value</p>
        <p className="text-xl font-semibold">${parseFloat(accountState.crossMarginSummary?.accountValue ?? '0').toFixed(2)}</p>
      </div>
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="text-sm text-gray-500">Withdrawable</p>
        <p className="text-xl font-semibold">${parseFloat(accountState.withdrawable ?? '0').toFixed(2)}</p>
      </div>
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-gray-500">Leverage</p>
        <p className="text-xl font-semibold">{parseFloat(accountState.crossMarginSummary?.leverage ?? '0').toFixed(2)}x</p>
      </div>
    </div>
  )
}
