"use client"

import React, { ReactNode, useState, useCallback, useEffect } from 'react'
import { AssetPosition, FetchedClearinghouseState } from '../types/hyperliquidTypes'
import { Table, Panel } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { formatNumber, formatFiat, formatPercent } from '@/utils/formatters'
import { useWallet } from '@/context/WalletContext'
import { usePosition } from '@/context/PositionContext'
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
  visibleColumns?: string[] // Array of visible column IDs
  onVisibleColumnsChange?: (visibleColumns: string[]) => void // Callback to update visible columns in parent
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
  onColumnOrderChange,
  visibleColumns = [],
  onVisibleColumnsChange
}: PositionsTableProps) {
  // Access the hideInfo state from WalletContext
  const { hideInfo } = useWallet()
  // Access the position context for chart integration
  const { selectedPosition, setSelectedPosition } = usePosition()
  
  // State for column visibility modal
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  // State for tracking which columns are visible
  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>(
    visibleColumns.length > 0 ? visibleColumns : []
  )
  
  // Get ordered columns based on columnOrder prop
  const [orderedColumns, setOrderedColumns] = useState<ColumnConfig[]>([])
  
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
      getValue: (position) => position.position.leverage?.value ?? 1,
      renderCell: (position) => <>{position.position.leverage?.value ?? 1}x</>
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
      renderCell: (position) => <>{formatFiat(position.position.positionValue, true, undefined, false, true, hideInfo)}</>
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
        return price != null ? parseFloat(price) : 0
      },
      renderCell: (position) => {
        const coin = position.position.coin
        const price = getMidPriceForCoin(coin, midPrices)
        if (price == null) return <>-</>
        
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
        const pnl = parseFloat(position.position.unrealizedPnl)
        const isPositive = pnl >= 0
        return (
          <Table.Cell 
            secondary
            positive={isPositive}
            negative={!isPositive}
          >
            {formatFiat(pnl, true, undefined, false, true, hideInfo)}
          </Table.Cell>
        )
      }
    },
    {
      id: 'returnOnEquity',
      label: 'ROE %',
      getValue: (position) => {
        const pnl = parseFloat(position.position.unrealizedPnl)
        const margin = parseFloat(position.position.marginUsed)
        return margin > 0 ? (pnl / margin) * 100 : 0
      },
      renderCell: (position) => {
        const pnl = parseFloat(position.position.unrealizedPnl)
        const margin = parseFloat(position.position.marginUsed)
        const roe = margin > 0 ? (pnl / margin) * 100 : 0
        const isPositive = roe >= 0
        return (
          <Table.Cell 
            secondary
            positive={isPositive}
            negative={!isPositive}
          >
            {formatPercent(roe)}
          </Table.Cell>
        )
      }
    },
    {
      id: 'marginUsed',
      label: 'MARGIN',
      getValue: (position) => parseFloat(position.position.marginUsed),
      renderCell: (position) => <>{formatFiat(position.position.marginUsed, true, undefined, false, true, hideInfo)}</>
    },
    {
      id: 'liquidationPrice',
      label: 'LIQ PRICE',
      getValue: (position) => parseFloat(position.position.liquidationPx ?? '0'),
      renderCell: (position) => <>{formatFiat(position.position.liquidationPx ?? '0', true, undefined, false, true, hideInfo)}</>
    },
    {
      id: 'funding',
      label: 'FUNDING',
      getValue: (position) => parseFloat(position.position.cumFunding?.sinceChange ?? '0'),
      renderCell: (position) => {
        const allTime = position.position.cumFunding?.allTime ?? '0'
        const sinceOpen = position.position.cumFunding?.sinceOpen ?? '0'
        const sinceChange = position.position.cumFunding?.sinceChange ?? '0'
        
        // Determine if values are positive or negative for color styling
        const sinceChangeNum = parseFloat(sinceChange)
        const sinceOpenNum = parseFloat(sinceOpen)
        const allTimeNum = parseFloat(allTime)
        
        // For funding, positive values (you pay funding) should be red, negative (you receive funding) should be green
        // This is opposite of normal PNL coloring because paying funding is bad, receiving is good
        const changeColor = sinceChangeNum >= 0 ? 'text-red-600' : 'text-green-600'
        const openColor = sinceOpenNum >= 0 ? 'text-red-600' : 'text-green-600'
        const cumColor = allTimeNum >= 0 ? 'text-red-600' : 'text-green-600'
        
        return (
          <div className="flex flex-col text-xs">
            <div>
              <span className="text-gray-500">change: </span>
              <span className={changeColor}>{formatFiat(sinceChange, true, undefined, false, false)}</span>
            </div>
            <div>
              <span className="text-gray-500">open: </span>
              <span className={openColor}>{formatFiat(sinceOpen, true, undefined, false, false)}</span>
            </div>
            <div>
              <span className="text-gray-500">cum: </span>
              <span className={cumColor}>{formatFiat(allTime, true, undefined, false, false)}</span>
            </div>
          </div>
        )
      }
    }
  ], [hideInfo, midPrices]) // Recreate columns when midPrices changes
  
  // Handle row click to select a position for the chart
  const handleRowClick = useCallback((position: AssetPosition) => {
    // Toggle selection: if clicking the same position, deselect it
    if (selectedPosition != null && selectedPosition.position.coin === position.position.coin) {
      setSelectedPosition(null)
    } else {
      setSelectedPosition(position)
    }
    
    console.log({
      event: 'position_selected',
      timestamp: new Date().toISOString(),
      coin: position.position.coin
    })
  }, [selectedPosition, setSelectedPosition])

  // Initialize visible columns if empty
  useEffect(() => {
    if (localVisibleColumns.length === 0 && columns.length > 0) {
      // Default to all columns visible
      const defaultVisibleColumns = columns.map(col => col.id)
      setLocalVisibleColumns(defaultVisibleColumns)
      if (onVisibleColumnsChange != null) {
        onVisibleColumnsChange(defaultVisibleColumns)
      }
    }
  }, [columns, localVisibleColumns.length, onVisibleColumnsChange])
  

  // Handle select all columns
  const handleSelectAll = useCallback(() => {
    // Get all column IDs including coin
    const allColumnIds = orderedColumns.map(col => col.id)
    setLocalVisibleColumns(allColumnIds)
  }, [orderedColumns])
  
  // Handle select none (deselect all columns except coin)
  const handleSelectNone = useCallback(() => {
    // Always keep coin column visible
    setLocalVisibleColumns(['coin'])
  }, [])

  // Handle toggling column visibility
  const handleToggleColumn = useCallback((columnId: string) => {
    setLocalVisibleColumns(prev => {
      // If column is currently visible, remove it
      if (prev.includes(columnId)) {
        const newVisibleColumns = prev.filter(id => id !== columnId)
        // Ensure at least one column remains visible
        if (newVisibleColumns.length === 0) {
          return prev
        }
        return newVisibleColumns
      } 
      // Otherwise add it
      return [...prev, columnId]
    })
  }, [])
  
  // Save column visibility changes
  const handleSaveColumnVisibility = useCallback(() => {
    if (onVisibleColumnsChange != null) {
      onVisibleColumnsChange(localVisibleColumns)
    }
    setIsColumnModalOpen(false)
  }, [localVisibleColumns, onVisibleColumnsChange])
  
  // Get a map of column configs by ID for easy lookup
  const columnsById = React.useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = column
      return acc
    }, {} as Record<string, ColumnConfig>)
  }, [columns])
  
  // Initialize ordered columns
  useEffect(() => {
    if (columnOrder.length > 0) {
      // Use the provided column order
      const newOrderedColumns = columnOrder
        .map(id => columnsById[id])
        .filter(Boolean) // Filter out any undefined columns
      setOrderedColumns(newOrderedColumns)
    } else {
      // Default to the original order
      setOrderedColumns(columns)
    }
  }, [columns, columnOrder, columnsById])
  
  // Filter columns based on visibility, but always include the coin column
  const visibleOrderedColumns = React.useMemo(() => {
    return orderedColumns.filter(column => 
      column.id === 'coin' || localVisibleColumns.includes(column.id)
    )
  }, [orderedColumns, localVisibleColumns])
  
  // Add any missing columns that might not be in the saved order
  useEffect(() => {
    if (orderedColumns.length > 0) {
      const missingColumns = columns.filter(col => 
        !orderedColumns.some(orderedCol => orderedCol.id === col.id)
      )
      
      if (missingColumns.length > 0) {
        setOrderedColumns(prev => [...prev, ...missingColumns])
      }
    }
  }, [columns, orderedColumns])
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
    
    if (over != null && active.id !== over.id) {
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
        if (onColumnOrderChange != null) {
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
    
    const column = orderedColumns.find(col => col.id === sortColumnId)
    if (column == null) return positions
    
    return [...positions].sort((a, b) => {
      // Special case for string comparisons like coin names
      const aValue = column.getValue(a)
      const bValue = column.getValue(b)
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      // For numeric values
      const aNum = Number(aValue)
      const bNum = Number(bValue)
      
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
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

  // Column visibility modal
  const renderColumnVisibilityModal = () => {
    return (
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Column Visibility"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select which columns to display in the positions table.
          </p>
          
          {/* Select All/None buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Select None
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {orderedColumns
              .filter(column => column.id !== 'coin') // Exclude coin column from options
              .map(column => (
                <div key={column.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`column-${column.id}`}
                    checked={localVisibleColumns.includes(column.id)}
                    onChange={() => handleToggleColumn(column.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`column-${column.id}`} className="ml-2 text-sm text-gray-700">
                    {column.label}
                  </label>
                </div>
              ))
            }
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsColumnModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveColumnVisibility}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div>
      {renderColumnVisibilityModal()}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <Table.Header>
            <tr>
              <SortableContext items={visibleOrderedColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                {visibleOrderedColumns.map((column, index) => (
                  <React.Fragment key={column.id}>
                    <SortableColumnHeader
                      id={column.id}
                      label={column.label}
                      onClick={() => handleSort(column.id)}
                      sortActive={sortColumnId === column.id}
                      sortDirection={sortColumnId === column.id ? sortDirection : null}
                      className={index < visibleOrderedColumns.length - 1 ? 'border-r border-gray-300' : ''}
                    />
                  </React.Fragment>
                ))}
                <th className="px-2 py-2 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => setIsColumnModalOpen(true)}
                    className="flex items-center p-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                    title="Edit columns"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </th>
              </SortableContext>
            </tr>
          </Table.Header>
          <Table.Body>
            {getSortedPositions().map((position: AssetPosition, index: number) => {
              // Check if this position is the selected one
              const isSelected = selectedPosition != null && selectedPosition.position.coin === position.position.coin
              
              return (
                <Table.Row 
                  key={position.position.coin} 
                  isEven={index % 2 === 0}
                  onClick={() => handleRowClick(position)}
                  className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20 transition-colors' : 'transition-colors'}
                >
                  {visibleOrderedColumns.map(column => (
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
                  {/* Empty cell to match the column settings button */}
                  <td></td>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </DndContext>
    </div>
  )
}
