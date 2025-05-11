"use client"

import { ReactNode } from 'react'
import { theme, baseStyles, cx } from '@/styles/theme'

export type PanelVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange'

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
  // Always use the default value style for consistent font styling
  const baseStyle = theme.text.values.default
  
  // Only apply color styles when needed
  const colorStyle = 
    positive != null ? baseStyles.colors.text.positive :
    negative != null ? baseStyles.colors.text.negative :
    ''

  return (
    <p className={cx(baseStyle, colorStyle, className)}>
      {children}
    </p>
  )
}
