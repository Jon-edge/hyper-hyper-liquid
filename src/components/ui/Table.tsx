"use client"

import { ReactNode, forwardRef, CSSProperties } from 'react'
import { theme, cx } from '@/styles/theme'

export interface TableProps {
  children: ReactNode
  className?: string
}

/**
 * Table component for standardized data tables
 */
export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cx(theme.table.container, className)}>
        {children}
      </table>
    </div>
  )
}

/**
 * Table.Header component for table headers
 */
Table.Header = function TableHeader({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <thead className={cx(theme.table.header.row, className)}>
      {children}
    </thead>
  )
}

/**
 * Table.HeaderCell component for sortable header cells
 */
Table.HeaderCell = forwardRef<HTMLTableCellElement, {
  children: ReactNode
  onClick?: () => void
  sortActive?: boolean
  sortDirection?: 'asc' | 'desc' | null
  className?: string
  style?: CSSProperties
}>(function TableHeaderCell({
  children,
  onClick,
  sortActive,
  sortDirection,
  className,
  style,
  ...props
}, ref) {
  return (
    <th
      ref={ref}
      scope="col"
      className={cx(theme.table.header.cell, onClick && 'cursor-pointer', className)}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
      {sortActive && sortDirection && (
        <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </th>
  )
})

/**
 * Table.Body component for table body
 */
Table.Body = function TableBody({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <tbody className={cx('divide-y divide-gray-200', className)}>
      {children}
    </tbody>
  )
}

/**
 * Table.Row component for table rows
 */
Table.Row = function TableRow({
  children,
  isEven = true,
  className,
  onClick
}: {
  children: ReactNode
  isEven?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <tr 
      className={cx(
        isEven ? theme.table.body.row.even : theme.table.body.row.odd,
        onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

/**
 * Table.Cell component for table cells
 */
Table.Cell = function TableCell({
  children,
  secondary = false,
  positive = false,
  negative = false,
  className
}: {
  children: ReactNode
  secondary?: boolean
  positive?: boolean
  negative?: boolean
  className?: string
}) {
  const cellStyle = secondary ? theme.table.body.cell.secondary : theme.table.body.cell.default
  const valueStyle = 
    positive ? theme.text.values.positive :
    negative ? theme.text.values.negative :
    ''
  
  return (
    <td className={cx(cellStyle, valueStyle, className)}>
      {children}
    </td>
  )
}
