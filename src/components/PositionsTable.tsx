"use client"

import { useState } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'
import { Table, Panel } from '@/components/ui'

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
      <div className="mt-6">
        <Panel variant="gray">
          <p>No positions found</p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Positions</h3>
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell 
              onClick={() => handleSort('coin')}
              sortActive={sortColumn === 'coin'}
              sortDirection={sortColumn === 'coin' ? sortDirection : null}
            >
              Coin
            </Table.HeaderCell>
            <Table.HeaderCell 
              onClick={() => handleSort('size')}
              sortActive={sortColumn === 'size'}
              sortDirection={sortColumn === 'size' ? sortDirection : null}
            >
              Size
            </Table.HeaderCell>
            <Table.HeaderCell 
              onClick={() => handleSort('value')}
              sortActive={sortColumn === 'value'}
              sortDirection={sortColumn === 'value' ? sortDirection : null}
            >
              Value
            </Table.HeaderCell>
            <Table.HeaderCell 
              onClick={() => handleSort('entryPrice')}
              sortActive={sortColumn === 'entryPrice'}
              sortDirection={sortColumn === 'entryPrice' ? sortDirection : null}
            >
              Entry Price
            </Table.HeaderCell>
            <Table.HeaderCell 
              onClick={() => handleSort('unrealizedPnl')}
              sortActive={sortColumn === 'unrealizedPnl'}
              sortDirection={sortColumn === 'unrealizedPnl' ? sortDirection : null}
            >
              Unrealized PnL
            </Table.HeaderCell>
            <Table.HeaderCell 
              onClick={() => handleSort('returnOnEquity')}
              sortActive={sortColumn === 'returnOnEquity'}
              sortDirection={sortColumn === 'returnOnEquity' ? sortDirection : null}
            >
              ROE
            </Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {getSortedPositions().map((position: AssetPosition, index: number) => (
            <Table.Row key={position.position.coin} isEven={index % 2 === 0}>
              <Table.Cell>
                {position.position.coin}
              </Table.Cell>
              <Table.Cell secondary>
                {parseFloat(position.position.szi).toFixed(4)}
              </Table.Cell>
              <Table.Cell secondary>
                ${parseFloat(position.position.positionValue).toFixed(2)}
              </Table.Cell>
              <Table.Cell secondary>
                ${parseFloat(position.position.entryPx).toFixed(2)}
              </Table.Cell>
              <Table.Cell 
                secondary
                positive={parseFloat(position.position.unrealizedPnl) >= 0}
                negative={parseFloat(position.position.unrealizedPnl) < 0}
              >
                ${parseFloat(position.position.unrealizedPnl).toFixed(2)}
              </Table.Cell>
              <Table.Cell 
                secondary
                positive={parseFloat(position.position.returnOnEquity) >= 0}
                negative={parseFloat(position.position.returnOnEquity) < 0}
              >
                {parseFloat(position.position.returnOnEquity).toFixed(2)}%
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}
