"use client"

import { theme, cx } from '@/styles/theme'

export interface LoaderProps {
  label?: string
  className?: string
}

/**
 * Loader component for indicating loading states
 */
export function Loader({ label, className }: LoaderProps) {
  return (
    <div className={cx("flex justify-center items-center py-4", className)}>
      <div className={theme.components.loader}></div>
      {label && <span className="ml-2">{label}</span>}
    </div>
  )
}
