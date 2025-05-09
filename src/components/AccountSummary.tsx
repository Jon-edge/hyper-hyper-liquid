"use client"

import type { AccountState } from '../types/hyperliquidTypes'
import { theme, cx } from '../styles/theme'

interface AccountSummaryProps {
  accountState: AccountState
}

export default function AccountSummary({ accountState }: AccountSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={cx(theme.containers.panel, theme.containers.panelVariants.blue)}>
        <p className={theme.text.body.small}>Account Value</p>
        <p className={theme.text.values.default}>${parseFloat(accountState.crossMarginSummary?.accountValue ?? '0').toFixed(2)}</p>
      </div>
      <div className={cx(theme.containers.panel, theme.containers.panelVariants.green)}>
        <p className={theme.text.body.small}>Withdrawable</p>
        <p className={theme.text.values.default}>${parseFloat(accountState.withdrawable ?? '0').toFixed(2)}</p>
      </div>
      <div className={cx(theme.containers.panel, theme.containers.panelVariants.yellow)}>
        <p className={theme.text.body.small}>Leverage</p>
        <p className={theme.text.values.default}>{parseFloat(accountState.crossMarginSummary?.leverage ?? '0').toFixed(2)}x</p>
      </div>
    </div>
  )
}
