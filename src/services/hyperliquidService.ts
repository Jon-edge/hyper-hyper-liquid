// Hyperliquid API service

interface UserState {
  assetPositions: {
    coin: string
    position: {
      szi: string // Size in base currency
      leverage: string
      entryPx: string // Entry price
      positionValue: string // Position value in USD
      unrealizedPnl: string // Unrealized profit and loss
      returnOnEquity: string // ROE
      liquidationPx: string // Liquidation price
      marginUsed: string // Margin used
    }
  }[]
  crossMarginSummary: {
    accountValue: string // Total account value in USD
    totalMarginUsed: string // Total margin used
    totalNtlPos: string // Total notional position
    totalRawUsd: string // Total raw USD
    leverage: string // Account leverage
  }
  withdrawable: string // Withdrawable amount
}

export interface AccountBalance {
  accountValue: string
  withdrawable: string
  leverage: string
  positions: {
    coin: string
    size: string
    value: string
    entryPrice: string
    unrealizedPnl: string
    returnOnEquity: string
  }[]
}

/**
 * Fetches the user's balance and position information from Hyperliquid API
 * @param address Ethereum address
 * @returns Account balance information
 */
export const fetchAccountBalance = async (address: string): Promise<AccountBalance> => {
  try {
    console.log('Fetching account balance for address:', address)
    
    // Format the address to lowercase to ensure consistency
    const formattedAddress = address.toLowerCase()
    
    // Use the correct API endpoint and format based on Hyperliquid docs
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: formattedAddress
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed with status ${response.status}:`, errorText)
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Received data from API:', data)
    
    // Check if the response has the expected structure
    if (!data.crossMarginSummary || !data.assetPositions) {
      // If the user has no positions or is not found, return a default structure
      return {
        accountValue: '0',
        withdrawable: '0',
        leverage: '0',
        positions: []
      }
    }
    
    // Format the data for easier consumption
    return {
      accountValue: data.crossMarginSummary.accountValue || '0',
      withdrawable: data.withdrawable || '0',
      leverage: data.crossMarginSummary.leverage || '0',
      positions: Array.isArray(data.assetPositions) ? data.assetPositions.map((position: any) => {
        console.log('Position data:', JSON.stringify(position, null, 2))
        return {
          // Extract coin name from either position.coin or position.position.coin
          coin: position.coin || (position.position && position.position.coin) || '',
          size: position.position?.szi || '0',
          value: position.position?.positionValue || '0',
          entryPrice: position.position?.entryPx || '0',
          unrealizedPnl: position.position?.unrealizedPnl || '0',
          returnOnEquity: position.position?.returnOnEquity || '0'
        }
      }) : []
    }
  } catch (error) {
    console.error('Error fetching account balance:', error)
    // Return a default structure instead of throwing
    return {
      accountValue: '0',
      withdrawable: '0',
      leverage: '0',
      positions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    } as AccountBalance & { error?: string }
  }
}

/**
 * Fetches available markets from Hyperliquid
 * @returns List of available markets
 */
export const fetchMarkets = async () => {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'allMeta'
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching markets:', error)
    throw error
  }
}
