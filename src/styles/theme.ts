/**
 * Centralized theme configuration for the Hyperliquid UI
 * 
 * This file contains reusable style classes and tokens to maintain
 * consistent styling across the application.
 */

// Base styles that can be referenced by other styles
export const baseStyles = {
  // Colors
  colors: {
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-500',
      white: 'text-white',
      positive: 'text-green-600',
      negative: 'text-red-600',
    },
    bg: {
      white: 'bg-white',
      gray: 'bg-gray-50',
      grayHover: 'hover:bg-gray-100',
      blue: 'bg-blue-50',
      blueBase: 'bg-blue-500',
      blueHover: 'hover:bg-blue-600',
      green: 'bg-green-50',
      yellow: 'bg-yellow-50',
      red: 'bg-red-50',
      redBase: 'bg-red-500',
      redHover: 'hover:bg-red-600',
      purple: 'bg-purple-50',
      orange: 'bg-orange-50',
    },
    focus: {
      blue: 'focus:ring-2 focus:ring-blue-300',
      red: 'focus:ring-2 focus:ring-red-300',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      mono: 'font-mono',
    },
    fontWeight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
  },
  
  // Spacing and layout
  spacing: {
    padding: {
      sm: 'p-1.5',
      md: 'p-4',
      button: 'px-4 py-2',
    },
    margin: {
      sm: 'mb-3',
      md: 'mb-4',
    },
    gap: {
      sm: 'gap-3',
    },
  },
  
  // Borders and shapes
  borders: {
    rounded: {
      default: 'rounded-lg',
      full: 'rounded-full',
    },
    divider: 'divide-y divide-gray-200',
    card: 'border border-gray-200 shadow-md',
  },
  
  // Effects
  effects: {
    transition: 'transition-colors',
    disabled: 'disabled:opacity-50',
    focus: 'focus:outline-none',
  },
  
  // Layout
  layout: {
    flex: {
      row: 'flex items-center',
      col: 'flex flex-col',
    },
  },
}

// Composite styles built from base styles
export const compositeStyles = {
  // Text styles
  text: {
    heading: {
      main: `${baseStyles.typography.fontSize['2xl']} ${baseStyles.typography.fontWeight.bold} ${baseStyles.spacing.margin.md} ${baseStyles.colors.text.primary}`,
      section: `${baseStyles.typography.fontSize.lg} ${baseStyles.typography.fontWeight.semibold} ${baseStyles.spacing.margin.sm} ${baseStyles.colors.text.primary}`,
    },
    body: {
      default: baseStyles.colors.text.primary,
      muted: baseStyles.colors.text.secondary,
      small: `${baseStyles.typography.fontSize.sm} ${baseStyles.colors.text.secondary}`,
    },
    values: {
      default: `${baseStyles.typography.fontSize.xl} ${baseStyles.typography.fontWeight.semibold} ${baseStyles.colors.text.primary}`,
      positive: baseStyles.colors.text.positive,
      negative: baseStyles.colors.text.negative,
    },
    mono: {
      default: `${baseStyles.typography.fontFamily.mono} ${baseStyles.typography.fontSize.base} ${baseStyles.colors.text.primary}`,
      address: `${baseStyles.typography.fontFamily.mono} ${baseStyles.typography.fontSize.base} ${baseStyles.typography.fontWeight.medium} ${baseStyles.colors.text.primary}`,
    },
  },
  
  // Button styles
  buttons: {
    base: `${baseStyles.borders.rounded.default} ${baseStyles.effects.transition} ${baseStyles.effects.focus}`,
    primary: `${baseStyles.spacing.padding.button} ${baseStyles.colors.bg.blueBase} ${baseStyles.colors.bg.blueHover} ${baseStyles.colors.text.white} ${baseStyles.typography.fontWeight.medium} ${baseStyles.colors.focus.blue} ${baseStyles.effects.disabled}`,
    danger: `${baseStyles.spacing.padding.button} ${baseStyles.colors.bg.redBase} ${baseStyles.colors.bg.redHover} ${baseStyles.colors.text.white} ${baseStyles.typography.fontWeight.medium} ${baseStyles.colors.focus.red}`,
    icon: `${baseStyles.spacing.padding.sm} ${baseStyles.borders.rounded.full} ${baseStyles.colors.bg.grayHover} ${baseStyles.colors.text.secondary} ${baseStyles.colors.focus.blue}`,
  },
  
  // Layout styles
  layout: {
    flex: {
      row: baseStyles.layout.flex.row,
      rowGap: `${baseStyles.layout.flex.row} ${baseStyles.spacing.gap.sm}`,
      col: baseStyles.layout.flex.col,
      colGap: `${baseStyles.layout.flex.col} ${baseStyles.spacing.gap.sm}`,
    },
  },
  
  // Container styles
  containers: {
    card: `${baseStyles.spacing.padding.md} ${baseStyles.colors.bg.white} ${baseStyles.borders.rounded.default} ${baseStyles.borders.card}`,
    panel: `${baseStyles.spacing.padding.md} ${baseStyles.borders.rounded.default}`,
    panelVariants: {
      blue: baseStyles.colors.bg.blue,
      green: baseStyles.colors.bg.green,
      yellow: baseStyles.colors.bg.yellow,
      red: baseStyles.colors.bg.red,
      gray: baseStyles.colors.bg.gray,
      purple: baseStyles.colors.bg.purple,
      orange: baseStyles.colors.bg.orange,
    },
  },
  
  // Component-specific styles
  components: {
    loader: `animate-spin ${baseStyles.borders.rounded.full} h-8 w-8 border-b-2 border-blue-500`,
    wallet: {
      address: `${baseStyles.spacing.padding.button} ${baseStyles.colors.bg.gray} ${baseStyles.borders.rounded.default}`,
    },
  },
  
  // Table styles
  table: {
    container: `min-w-full ${baseStyles.borders.divider}`,
    header: {
      row: baseStyles.colors.bg.gray,
      cell: `px-6 py-3 text-left ${baseStyles.typography.fontSize.xs} ${baseStyles.typography.fontWeight.medium} ${baseStyles.colors.text.secondary} uppercase tracking-wider cursor-pointer`,
    },
    body: {
      row: {
        even: baseStyles.colors.bg.white,
        odd: baseStyles.colors.bg.gray,
      },
      cell: {
        default: `px-6 py-4 whitespace-nowrap ${baseStyles.typography.fontSize.sm} ${baseStyles.colors.text.primary}`,
        secondary: `px-6 py-4 whitespace-nowrap ${baseStyles.typography.fontSize.sm} ${baseStyles.colors.text.secondary}`,
      },
    },
  },
}

// Export the theme object for backward compatibility
export const theme = compositeStyles

// Helper for combining multiple theme classes
export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}
