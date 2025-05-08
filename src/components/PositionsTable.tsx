"use client"

import { useState } from 'react'
import { UserState } from '@/services/hyperliquidService'

type SortDirection = 'asc' | 'desc' | null
type SortColumn = 'coin' | 'size' | 'value' | 'entryPrice' | 'unrealizedPnl' | 'returnOnEquity' | null

interface PositionsTableProps {
  positions: UserState['positions']
}

export default function PositionsTable({ positions }: PositionsTableProps) {
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
    if (!positions || !sortColumn || !sortDirection) {
      return positions || []
    }

    return [...positions].sort((a, b) => {
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

  if (positions.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No positions found</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Positions</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('coin')}
              >
                Coin
                {sortColumn === 'coin' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('size')}
              >
                Size
                {sortColumn === 'size' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('value')}
              >
                Value
                {sortColumn === 'value' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('entryPrice')}
              >
                Entry Price
                {sortColumn === 'entryPrice' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('unrealizedPnl')}
              >
                Unrealized PnL
                {sortColumn === 'unrealizedPnl' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('returnOnEquity')}
              >
                ROE
                {sortColumn === 'returnOnEquity' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedPositions().map((position, index) => (
              <tr key={position.coin} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {position.coin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {parseFloat(position.size).toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${parseFloat(position.value).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${parseFloat(position.entryPrice).toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${parseFloat(position.unrealizedPnl).toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.returnOnEquity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(position.returnOnEquity).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
