"use client"

import { useWallet } from '@/context/WalletContext'
import { theme, cx } from '@/styles/theme'

// Eye open/closed SVG icons as components
const EyeOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
)

const EyeClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
    <path d="M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"></path>
    <line x1="3" y1="21" x2="21" y2="3"></line>
  </svg>
)

export default function WalletConnect() {
  const { account, connect, disconnect, isConnecting, hideInfo, toggleHideInfo } = useWallet()

  // Display either full account (truncated) or redacted version based on hideInfo state
  const displayAccount = account ? (
    hideInfo ? 
      "0x" + "•".repeat(8) : 
      `${account.slice(0, 6)}...${account.slice(-4)}`
  ) : null
  
  return (
    <div className={theme.layout.flex.row}>
      {account ? (
        <div className={theme.layout.flex.rowGap}>
          {/* Eye icon toggle button */}
          <button 
            onClick={toggleHideInfo}
            className={cx(theme.buttons.base, theme.buttons.icon)}
            aria-label={hideInfo ? "Show sensitive information" : "Hide sensitive information"}
            title={hideInfo ? "Show sensitive information" : "Hide sensitive information"}
          >
            {hideInfo ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
          
          <div className={cx(theme.components.wallet.address, theme.text.mono.address)}>
            {displayAccount}
          </div>
          
          <button
            onClick={disconnect}
            className={cx(theme.buttons.base, theme.buttons.danger)}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className={cx(theme.buttons.base, theme.buttons.primary)}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
