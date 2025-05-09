"use client"

import React, { ReactNode, useState } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'
import { Table, Panel } from '@/components/ui'
import { formatNumber, formatFiat, formatPercent } from '@/utils/formatters'

type SortDirection = 'asc' | 'desc' | null

// Define the column configuration interface
interface ColumnConfig {
  id: string
  label: string
  getValue: (position: AssetPosition) => string | number
  renderCell: (position: AssetPosition) => ReactNode
}

interface PositionsTableProps {
  positions: FetchedClearinghouseState['assetPositions']
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  // Define column configuration as a single source of truth
  const columns: ColumnConfig[] = [
    {
      id: 'coin',
      label: 'COIN',
      getValue: (position) => position.position.coin,
      renderCell: (position) => <>{position.position.coin}</>
    },
    {
      id: 'leverage',
      label: 'LEV',
      getValue: (position) => position.position.leverage?.value || 1,
      renderCell: (position) => <>{position.position.leverage?.value ? `${position.position.leverage.value}x` : '1x'}</>
    },
    {
      id: 'size',
      label: 'SIZE',
      getValue: (position) => parseFloat(position.position.szi),
      renderCell: (position) => <>{formatNumber(position.position.szi, 4, 0, undefined, true)}</>
    },
    {
      id: 'value',
      label: 'VALUE',
      getValue: (position) => parseFloat(position.position.positionValue),
      renderCell: (position) => <>{formatFiat(position.position.positionValue)}</>
    },
    {
      id: 'entryPrice',
      label: 'ENTRY',
      getValue: (position) => parseFloat(position.position.entryPx),
      renderCell: (position) => <>{formatFiat(position.position.entryPx)}</>
    },
    {
      id: 'unrealizedPnl',
      label: 'PNL',
      getValue: (position) => parseFloat(position.position.unrealizedPnl),
      renderCell: (position) => {
        const pnl = parseFloat(position.position.unrealizedPnl);
        const isPositive = pnl >= 0;
        return (
          <Table.Cell 
            secondary
            positive={isPositive}
            negative={!isPositive}
          >
            {formatFiat(pnl)}
          </Table.Cell>
        );
      }
    },
    {
      id: 'returnOnEquity',
      label: 'ROE %',
      getValue: (position) => {
        const pnl = parseFloat(position.position.unrealizedPnl);
        const margin = parseFloat(position.position.marginUsed);
        return margin > 0 ? (pnl / margin) * 100 : 0;
      },
      renderCell: (position) => {
        const pnl = parseFloat(position.position.unrealizedPnl);
        const margin = parseFloat(position.position.marginUsed);
        const roe = margin > 0 ? (pnl / margin) * 100 : 0;
        const isPositive = roe >= 0;
        return (
          <Table.Cell 
            secondary
            positive={isPositive}
            negative={!isPositive}
          >
            {formatPercent(roe)}
          </Table.Cell>
        );
      }
    },
    {
      id: 'marginUsed',
      label: 'MARGIN',
      getValue: (position) => parseFloat(position.position.marginUsed),
      renderCell: (position) => <>{formatFiat(position.position.marginUsed)}</>
    },
    {
      id: 'liquidationPrice',
      label: 'LIQ PRICE',
      getValue: (position) => parseFloat(position.position.liquidationPx || '0'),
      renderCell: (position) => <>
        {position.position.liquidationPx 
          ? formatFiat(position.position.liquidationPx) 
          : 'N/A'}
      </>
    },
    {
      id: 'funding',
      label: 'FUNDING',
      getValue: (position) => parseFloat(position.position.cumFunding?.allTime || '0'),
      renderCell: (position) => <>
        {position.position.cumFunding?.allTime 
          ? formatFiat(position.position.cumFunding.allTime) 
          : formatFiat(0)}
      </>
    }
  ];
  
  const [sortColumnId, setSortColumnId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Handle sorting when a column header is clicked
  const handleSort = (columnId: string) => {
    if (sortColumnId === columnId) {
      // Toggle direction if same column is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
      if (sortDirection === 'desc') {
        setSortColumnId(null)
      }
    } else {
      // Set new column and direction
      setSortColumnId(columnId)
      setSortDirection('asc')
    }
  }

  // Sort the positions based on current sort settings
  const getSortedPositions = () => {
    if (positions == null || sortColumnId == null || sortDirection == null) {
      return positions != null ? positions : []
    }
    
    const column = columns.find(col => col.id === sortColumnId);
    if (!column) return positions;
    
    return [...positions].sort((a, b) => {
      // Special case for string comparisons like coin names
      const aValue = column.getValue(a);
      const bValue = column.getValue(b);
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      // For numeric values
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
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
            {columns.map(column => (
              <Table.HeaderCell 
                key={column.id}
                onClick={() => handleSort(column.id)}
                sortActive={sortColumnId === column.id}
                sortDirection={sortColumnId === column.id ? sortDirection : null}
              >
                {column.label}
              </Table.HeaderCell>
            ))}
          </tr>
        </Table.Header>
        <Table.Body>
          {getSortedPositions().map((position: AssetPosition, index: number) => (
            <Table.Row key={position.position.coin} isEven={index % 2 === 0}>
              {columns.map(column => (
                <React.Fragment key={column.id}>
                  {/* For custom cell rendering with colors */}
                  {column.id === 'unrealizedPnl' || column.id === 'returnOnEquity' ? (
                    column.renderCell(position)
                  ) : (
                    <Table.Cell secondary>
                      {column.renderCell(position)}
                    </Table.Cell>
                  )}
                </React.Fragment>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}
