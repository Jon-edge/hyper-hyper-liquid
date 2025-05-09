"use client"

import { ReactNode } from 'react'
import { theme, cx } from '@/styles/theme'

export type MessageVariant = 'info' | 'success' | 'warning' | 'error'

export interface MessageProps {
  children: ReactNode
  variant?: MessageVariant
  className?: string
}

/**
 * Message component for displaying info, warnings and errors
 */
export function Message({ children, variant = 'info', className }: MessageProps) {
  const variantStyles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  }

  return (
    <div className={cx(
      theme.containers.panel,
      variantStyles[variant],
      'mb-4',
      className
    )}>
      {children}
    </div>
  )
}
