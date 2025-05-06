"use client"

import { useState, useEffect } from 'react'
import { useWallet } from '@/context/WalletContext'
import { fetchAccountBalance, AccountBalance as AccountBalanceType } from '@/services/hyperliquidService'

type SortDirection = 'asc' | 'desc' | null
type SortColumn = 'coin' | 'size' | 'value' | 'entryPrice' | 'unrealizedPnl' | 'returnOnEquity' | null

export default function AccountBalance() {
  const { account } = useWallet()
  const [balance, setBalance] = useState<AccountBalanceType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Handle sorting when a column header is clicked
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
      if (sortDirection === 'desc') {
        setSortColumn(null)
      }
    } else {
      // Set new column and direction
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort the positions based on current sort settings
  const getSortedPositions = () => {
    if (!balance || !balance.positions || !sortColumn || !sortDirection) {
      return balance?.positions || []
    }

    return [...balance.positions].sort((a, b) => {
      // Handle different column types appropriately
      if (sortColumn === 'coin') {
        return sortDirection === 'asc' 
          ? a.coin.localeCompare(b.coin)
          : b.coin.localeCompare(a.coin)
      }
      
      // For numeric columns, convert to numbers for comparison
      const aValue = parseFloat(a[sortColumn] || '0')
      const bValue = parseFloat(b[sortColumn] || '0')
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  useEffect(() => {
    const getBalance = async () => {
      if (!account) return

      setLoading(true)
      setError(null)
      
      try {
        const data = await fetchAccountBalance(account)
        
        // Check if there was an error returned from the service
        if ('error' in data) {
          setError(`Failed to fetch account balance: ${data.error}`)
          console.error('Error in account data:', data.error)
        } else {
          setBalance(data)
        }
      } catch (err) {
        setError('Failed to fetch account balance. Please try again.')
        console.error('Error fetching balance:', err)
      } finally {
        setLoading(false)
      }
    }

    getBalance()
  }, [account])

  if (!account) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Connect your wallet to view your account balance</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Loading account data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow-sm border border-red-200">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Account Balance</h2>
      
      {balance ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">Account Value</p>
              <p className="text-xl font-semibold">${parseFloat(balance.accountValue).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500">Withdrawable</p>
              <p className="text-xl font-semibold">${parseFloat(balance.withdrawable).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-500">Leverage</p>
              <p className="text-xl font-semibold">{parseFloat(balance.leverage).toFixed(2)}x</p>
            </div>
          </div>

          {balance.positions.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Positions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('coin')}
                      >
                        Asset
                        {sortColumn === 'coin' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('size')}
                      >
                        Size
                        {sortColumn === 'size' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('value')}
                      >
                        Value
                        {sortColumn === 'value' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('entryPrice')}
                      >
                        Entry Price
                        {sortColumn === 'entryPrice' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('unrealizedPnl')}
                      >
                        PnL
                        {sortColumn === 'unrealizedPnl' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('returnOnEquity')}
                      >
                        ROE
                        {sortColumn === 'returnOnEquity' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedPositions().map((position, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.coin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(position.size).toFixed(4)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(position.value).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(position.entryPrice).toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${parseFloat(position.unrealizedPnl).toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.returnOnEquity) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {parseFloat(position.returnOnEquity).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No positions found</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500">No account data available</p>
      )}
    </div>
  )
}
