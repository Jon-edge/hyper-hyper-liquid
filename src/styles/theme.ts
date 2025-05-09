/**
 * Centralized theme configuration for the Hyperliquid UI
 * 
 * This file contains reusable style classes and tokens to maintain
 * consistent styling across the application.
 */

export const theme = {
  // Text styles
  text: {
    heading: {
      main: 'text-2xl font-bold mb-4 text-gray-900',
      section: 'text-lg font-semibold mb-3 text-gray-900',
    },
    body: {
      default: 'text-gray-900',
      muted: 'text-gray-500',
      small: 'text-sm text-gray-500',
    },
    values: {
      default: 'text-xl font-semibold text-gray-900',
      positive: 'text-green-600',
      negative: 'text-red-600',
    },
  },
  
  // Container styles
  containers: {
    card: 'p-6 bg-white rounded-lg shadow-md border border-gray-200',
    panel: 'p-4 rounded-lg',
    panelVariants: {
      blue: 'bg-blue-50',
      green: 'bg-green-50',
      yellow: 'bg-yellow-50',
      red: 'bg-red-50',
      gray: 'bg-gray-50',
    },
  },
  
  // Table styles
  table: {
    container: 'min-w-full divide-y divide-gray-200',
    header: {
      row: 'bg-gray-50',
      cell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer',
    },
    body: {
      row: {
        even: 'bg-white',
        odd: 'bg-gray-50',
      },
      cell: {
        default: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
        secondary: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500',
      },
    },
  },
  
  // Common component styles
  components: {
    loader: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500',
  },
}

// Helper for combining multiple theme classes
export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}
