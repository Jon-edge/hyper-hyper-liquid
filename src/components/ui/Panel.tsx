"use client"

import { ReactNode } from 'react'
import { theme, cx } from '@/styles/theme'

export type PanelVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray'

export interface PanelProps {
  children: ReactNode
  variant?: PanelVariant
  className?: string
}

/**
 * Panel component for displaying information in colored containers
 */
export function Panel({ children, variant = 'gray', className }: PanelProps) {
  return (
    <div className={cx(
      theme.containers.panel, 
      theme.containers.panelVariants[variant], 
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Panel.Label component for consistent panel labels
 */
Panel.Label = function PanelLabel({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <p className={cx(theme.text.body.small, className)}>
      {children}
    </p>
  )
}

/**
 * Panel.Value component for consistent panel values
 */
Panel.Value = function PanelValue({ 
  children, 
  positive, 
  negative,
  className 
}: { 
  children: ReactNode
  positive?: boolean
  negative?: boolean
  className?: string 
}) {
  const valueStyle = 
    positive ? theme.text.values.positive :
    negative ? theme.text.values.negative :
    theme.text.values.default

  return (
    <p className={cx(valueStyle, className)}>
      {children}
    </p>
  )
}
