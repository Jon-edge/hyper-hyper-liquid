"use client"

import { useState } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'
import { theme, cx } from '../styles/theme'

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
      <div className={cx("mt-6", theme.containers.panel, theme.containers.panelVariants.gray)}>
        <p className={theme.text.body.muted}>No positions found</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className={theme.text.heading.section}>Positions</h3>
      <div className="overflow-x-auto">
        <table className={theme.table.container}>
          <thead className={theme.table.header.row}>
            <tr>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('coin')}
              >
                Coin
                {sortColumn === 'coin' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('size')}
              >
                Size
                {sortColumn === 'size' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('value')}
              >
                Value
                {sortColumn === 'value' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('entryPrice')}
              >
                Entry Price
                {sortColumn === 'entryPrice' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('unrealizedPnl')}
              >
                Unrealized PnL
                {sortColumn === 'unrealizedPnl' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className={cx(theme.table.header.cell, 'cursor-pointer')}
                onClick={() => handleSort('returnOnEquity')}
              >
                ROE
                {sortColumn === 'returnOnEquity' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getSortedPositions().map((position: AssetPosition, index: number) => (
              <tr key={position.position.coin} className={index % 2 === 0 ? theme.table.body.row.even : theme.table.body.row.odd}>
                <td className={theme.table.body.cell.default}>
                  {position.position.coin}
                </td>
                <td className={theme.table.body.cell.secondary}>
                  {parseFloat(position.position.szi).toFixed(4)}
                </td>
                <td className={theme.table.body.cell.secondary}>
                  ${parseFloat(position.position.positionValue).toFixed(2)}
                </td>
                <td className={theme.table.body.cell.secondary}>
                  ${parseFloat(position.position.entryPx).toFixed(2)}
                </td>
                <td className={cx(theme.table.body.cell.secondary, parseFloat(position.position.unrealizedPnl) >= 0 ? theme.text.values.positive : theme.text.values.negative)}>
                  ${parseFloat(position.position.unrealizedPnl).toFixed(2)}
                </td>
                <td className={cx(theme.table.body.cell.secondary, parseFloat(position.position.returnOnEquity) >= 0 ? theme.text.values.positive : theme.text.values.negative)}>
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
