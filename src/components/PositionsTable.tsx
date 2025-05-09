"use client"

import { useState } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'

type SortDirection = 'asc' | 'desc' | null
type SortColumn = 'coin' | 'size' | 'value' | 'entryPrice' | 'unrealizedPnl' | 'returnOnEquity' | null

interface PositionsTableProps {
  positions: FetchedClearinghouseState['assetPositions']
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
    if (positions == null || sortColumn == null || sortDirection == null) {
      return positions != null ? positions : []
    }

    return [...positions].sort((a, b) => {
      // Handle different column types appropriately
      if (sortColumn === 'coin') {
        return sortDirection === 'asc' 
          ? a.position.coin.localeCompare(b.position.coin)
          : b.position.coin.localeCompare(a.position.coin)
      }
      
      // Map position properties to their actual paths in the data structure
      const getPositionValue = (position: AssetPosition, column: SortColumn): string => {
        switch(column) {
          case 'coin': return position.position.coin
          case 'size': return position.position.szi
          case 'value': return position.position.positionValue
          case 'entryPrice': return position.position.entryPx
          case 'unrealizedPnl': return position.position.unrealizedPnl
          case 'returnOnEquity': return position.position.returnOnEquity
          default: return '0'
        }
      }
      
      // For numeric columns, convert to numbers for comparison
      const aValue = parseFloat(getPositionValue(a, sortColumn))
      const bValue = parseFloat(getPositionValue(b, sortColumn))
      
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
            {getSortedPositions().map((position: AssetPosition, index: number) => (
              <tr key={position.position.coin} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {position.position.coin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {parseFloat(position.position.szi).toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${parseFloat(position.position.positionValue).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${parseFloat(position.position.entryPx).toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.position.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${parseFloat(position.position.unrealizedPnl).toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(position.position.returnOnEquity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(position.position.returnOnEquity).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
