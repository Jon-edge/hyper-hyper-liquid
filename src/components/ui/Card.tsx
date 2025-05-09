"use client"

import { ReactNode } from 'react'
import { theme, cx } from '@/styles/theme'

export interface CardProps {
  children: ReactNode
  className?: string
}

/**
 * Card component for containing content in a styled container
 */
export function Card({ children, className }: CardProps) {
  return (
    <div className={cx(theme.containers.card, className)}>
      {children}
    </div>
  )
}

/**
 * Card.Header component for consistent section headings
 */
Card.Header = function CardHeader({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <h2 className={cx(theme.text.heading.main, className)}>
      {children}
    </h2>
  )
}
