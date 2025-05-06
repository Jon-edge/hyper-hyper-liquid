"use client"

import { useWallet } from '@/context/WalletContext'

export default function WalletConnect() {
  const { account, connect, disconnect, isConnecting } = useWallet()

  return (
    <div className="flex items-center">
      {account ? (
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono">
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
