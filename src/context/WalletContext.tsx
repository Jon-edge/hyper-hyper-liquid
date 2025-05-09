"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'

interface WalletContextType {
  account: string | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnecting: boolean
  provider: ethers.providers.Web3Provider | null
  hideInfo: boolean
  toggleHideInfo: () => void
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
  provider: null,
  hideInfo: false,
  toggleHideInfo: () => {}
})

export const useWallet = () => useContext(WalletContext)

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [hideInfo, setHideInfo] = useState(false)

  useEffect(() => {
    // Check if MetaMask is installed
    if (window?.ethereum != null) {
      // Initialize provider
      const ethProvider = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(ethProvider)

      // Check if already connected
      const checkConnection = async () => {
        try {
          const accounts = await ethProvider.listAccounts()
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        } catch (error) {
          console.error('Failed to check connection:', error)
        }
      }

      checkConnection()

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        } else {
          setAccount(null)
        }
      })

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }
  }, [])

  const connect = async () => {
    if (window.ethereum == null) {
      alert('Please install MetaMask to use this feature')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      setAccount(accounts[0])
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAccount(null)
  }
  
  const toggleHideInfo = () => {
    // Log the state change with structured format
    console.log({
      event: 'account_info_visibility_changed',
      timestamp: new Date().toISOString(),
      from: hideInfo ? 'hidden' : 'visible',
      to: hideInfo ? 'visible' : 'hidden'
    })
    
    setHideInfo(prev => !prev)
  }

  return (
    <WalletContext.Provider
      value={{
        account,
        connect,
        disconnect,
        isConnecting,
        provider,
        hideInfo,
        toggleHideInfo
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
