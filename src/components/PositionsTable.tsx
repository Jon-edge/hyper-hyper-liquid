"use client"

import React, { ReactNode, useState, useCallback } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'
import { Table, Panel } from '@/components/ui'
import { formatNumber, formatFiat, formatPercent } from '@/utils/formatters'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  midPrices: Record<string, string>
  columnOrder?: string[] // Array of column IDs in their current order
  onColumnOrderChange?: (columnOrder: string[]) => void // Callback to update column order in parent
}

// Sortable column header component
function SortableColumnHeader({ id, label, sortActive, sortDirection, onClick, className }: {
  id: string
  label: string
  sortActive?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onClick?: () => void
  className?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  }
  
  return (
    <Table.HeaderCell
      ref={setNodeRef}
      style={style}
      className={className}
      {...attributes}
      {...listeners}
      sortActive={sortActive}
      sortDirection={sortDirection}
      onClick={onClick}
    >
      {label}
    </Table.HeaderCell>
  )
}

// Helper function to get mid price by trying different key formats
function getMidPriceForCoin(coin: string, midPrices: Record<string, string>): string | undefined {
  // Try direct coin name match
  if (midPrices[coin]) {
    return midPrices[coin]
  }
  
  // Try with @ prefix (commonly used in API)
  if (midPrices[`@${coin}`]) {
    return midPrices[`@${coin}`]
  }
  
  // Try lowercase
  if (midPrices[coin.toLowerCase()]) {
    return midPrices[coin.toLowerCase()]
  }
  
  // Try with index format for common coins (based on Hyperliquid API)
  const commonCoinIndices: Record<string, string> = {
    'BTC': '@1',
    'ETH': '@10',
    'SOL': '@5',
    'AVAX': '@8',
    'ARB': '@9',
    'OP': '@11'
  }
  
  if (commonCoinIndices[coin] && midPrices[commonCoinIndices[coin]]) {
    return midPrices[commonCoinIndices[coin]]
  }
  
  return undefined
}

export default function PositionsTable({ 
  positions, 
  midPrices, 
  columnOrder = [], 
  onColumnOrderChange 
}: PositionsTableProps) {
  
  // Define column configuration as a single source of truth - now using useMemo to recreate when midPrices changes
  const columns = React.useMemo<ColumnConfig[]>(() => [
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
      renderCell: (position) => <>{formatFiat(position.position.entryPx, true, undefined, true)}</>
    },
    {
      id: 'midPrice',
      label: 'MID',
      getValue: (position) => {
        const coin = position.position.coin
        const price = getMidPriceForCoin(coin, midPrices)
        return price ? parseFloat(price) : 0
      },
      renderCell: (position) => {
        const coin = position.position.coin
        const price = getMidPriceForCoin(coin, midPrices)
        if (!price) return <>-</>
        
        // Calculate percentage difference from entry price
        const entryPrice = parseFloat(position.position.entryPx)
        const midPrice = parseFloat(price)
        const priceDelta = entryPrice > 0 ? ((midPrice - entryPrice) / entryPrice) * 100 : 0
        const isPositive = priceDelta > 0
        const isNegative = priceDelta < 0
        
        return (
          <div className="flex flex-col">
            <div>{formatFiat(price, true, undefined, true)}</div>
            <div className={`text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
              {priceDelta > 0 ? '+' : ''}{formatPercent(priceDelta)}
            </div>
          </div>
        )
      }
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
  ], [midPrices]); // Recreate columns when midPrices changes
  
  // Get a map of column configs by ID for easy lookup
  const columnsById = React.useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = column
      return acc
    }, {} as Record<string, ColumnConfig>)
  }, [columns])
  
  // Create orderedColumns based on either props.columnOrder or default order
  const orderedColumns = React.useMemo(() => {
    // If we have a column order from props, use it to order the columns
    if (columnOrder && columnOrder.length > 0) {
      // Create ordered columns array based on saved order
      const ordered = columnOrder
        .filter(id => columnsById[id]) // Only include columns that exist
        .map(id => columnsById[id])
      
      // Add any new columns that might not be in the saved order
      columns.forEach(col => {
        if (!columnOrder.includes(col.id)) {
          ordered.push(col)
        }
      })
      
      return ordered
    }
    
    // Otherwise just use the columns in their default order
    return [...columns]
  }, [columns, columnsById, columnOrder])
  const [sortColumnId, setSortColumnId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  
  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
  
  // Simple drag start handler
  const handleDragStart = useCallback(() => {
    console.log({
      event: 'column_drag_started',
      timestamp: new Date().toISOString()
    })
  }, [])
  
  // Handle drag end event for column reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log({
      event: 'column_drag_ended',
      timestamp: new Date().toISOString()
    })
    
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      // Find the indexes in the current order
      const oldIndex = orderedColumns.findIndex((item) => item.id === active.id)
      const newIndex = orderedColumns.findIndex((item) => item.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Create the new ordered column list
        const newOrderedColumns = arrayMove([...orderedColumns], oldIndex, newIndex)
        
        // Extract just the IDs for parent storage
        const newColumnOrder = newOrderedColumns.map(col => col.id)
        
        // Log the column order change
        console.log({
          event: 'column_order_changed',
          timestamp: new Date().toISOString(),
          from_index: oldIndex,
          to_index: newIndex,
          column_id: active.id
        })
        
        // Notify parent component if callback provided
        if (onColumnOrderChange) {
          onColumnOrderChange(newColumnOrder)
        }
      }
    }
  }, [orderedColumns, onColumnOrderChange])

  // Sort the positions based on current sort settings
  const getSortedPositions = () => {
    if (positions == null || sortColumnId == null || sortDirection == null) {
      return positions != null ? positions : []
    }
    
    const column = orderedColumns.find(col => col.id === sortColumnId);
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <Table.Header>
            <tr>
              <SortableContext items={orderedColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                {orderedColumns.map((column, index) => (
                  <React.Fragment key={column.id}>
                    <SortableColumnHeader
                      id={column.id}
                      label={column.label}
                      onClick={() => handleSort(column.id)}
                      sortActive={sortColumnId === column.id}
                      sortDirection={sortColumnId === column.id ? sortDirection : null}
                      className={index < orderedColumns.length - 1 ? 'border-r border-gray-300' : ''}
                    />
                  </React.Fragment>
                ))}
              </SortableContext>
            </tr>
          </Table.Header>
          <Table.Body>
            {getSortedPositions().map((position: AssetPosition, index: number) => (
              <Table.Row key={position.position.coin} isEven={index % 2 === 0}>
                {orderedColumns.map(column => (
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
      </DndContext>
    </div>
  )
}
