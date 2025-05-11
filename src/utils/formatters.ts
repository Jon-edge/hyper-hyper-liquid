/**
 * Utility functions for formatting numbers and currency values
 */

/**
 * Formats a number with adaptive precision, showing fewer decimal places
 * for larger numbers. Keeps decimal places even for whole numbers.
 * Optionally adds suffixes (k, M, B) for large numbers.
 * 
 * @param value The number to format
 * @param maxPrecision Maximum number of decimal places to show (default: 4)
 * @param minPrecision Minimum number of decimal places to show (default: 0)
 * @param forcePrecision If provided, overrides adaptive precision and uses this exact precision
 * @param useCompactNotation If true, adds suffixes for thousands (k), millions (M), billions (B)
 * @returns Formatted string representation of the number
 */
export function formatNumber(
  value: number | string,
  maxPrecision: number = 4,
  minPrecision: number = 0,
  forcePrecision?: number,
  useCompactNotation: boolean = false
): string {
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  // Handle NaN, undefined, etc.
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  
  // If using compact notation for large numbers
  if (useCompactNotation) {
    const absValue = Math.abs(num)
    
    // Apply suffixes based on magnitude
    if (absValue >= 1_000_000_000) { // Billions
      const scaledValue = num / 1_000_000_000
      const precision = forcePrecision !== undefined ? forcePrecision : 2
      return `${scaledValue.toFixed(precision)}B`
    } else if (absValue >= 1_000_000) { // Millions
      const scaledValue = num / 1_000_000
      const precision = forcePrecision !== undefined ? forcePrecision : 2
      return `${scaledValue.toFixed(precision)}M`
    } else if (absValue >= 1_000) { // Thousands
      const scaledValue = num / 1_000
      const precision = forcePrecision !== undefined ? forcePrecision : 1
      return `${scaledValue.toFixed(precision)}k`
    }
    // For smaller numbers, fall through to standard formatting
  }
  
  // If forcePrecision is provided, use it instead of calculating adaptive precision
  let precision: number
  
  if (forcePrecision !== undefined) {
    precision = forcePrecision
  } else {
    // Calculate adaptive precision based on value magnitude
    precision = maxPrecision
    const absValue = Math.abs(num)
    
    if (absValue >= 1000) {
      precision = Math.max(0, minPrecision)
    } else if (absValue >= 100) {
      precision = Math.max(1, minPrecision)
    } else if (absValue >= 10) {
      precision = Math.max(2, minPrecision)
    } else if (absValue >= 1) {
      precision = Math.max(2, minPrecision)
    }
  }
  
  // Format with the determined precision
  return num.toFixed(precision)
}

/**
 * Formats a number as a fiat currency value (USD),
 * with special handling for negative values and adaptive precision.
 * - Shows cents only if < $1000 (unless forcePrecision is specified)
 * - Places negative sign before $ symbol
 * - Optionally adds thousands separators (commas)
 * - For small values (< $1), increases precision based on magnitude
 * 
 * @param value The number to format as currency
 * @param showCommas Whether to show commas as thousands separators (default: true)
 * @param forcePrecision If provided, overrides adaptive precision and uses this exact precision
 * @param adaptiveSmallValuePrecision If true, increases precision for small values (< $1) based on magnitude
 * @returns Formatted currency string
 */
export function formatFiat(
  value: number | string,
  showCommas: boolean = true,
  forcePrecision?: number,
  adaptiveSmallValuePrecision: boolean = false,
  isSensitive: boolean = false,
  hideInfo: boolean = false
): string {
  // Return redacted value if this is sensitive and hide info is enabled
  if (isSensitive && hideInfo) {
    return '$ ••••••'
  }
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  // Handle NaN, undefined, etc.
  if (num === null || num === undefined || isNaN(num)) {
    return '$0'
  }
  
  const isNegative = num < 0
  const absValue = Math.abs(num)
  
  // Determine decimal precision based on magnitude or use forced precision
  let precision: number
  
  if (forcePrecision !== undefined) {
    precision = forcePrecision
  } else {
    // Default to 2 decimal places (cents)
    precision = 2
    
    // For values >= $1000, don't show cents
    if (absValue >= 1000) {
      precision = 0
    }
    
    // For small values, increase precision based on magnitude
    if (adaptiveSmallValuePrecision && absValue < 1) {
      // Find the last non-zero digit in the decimal part
      const strValue = absValue.toFixed(10) // Use a high precision to start with
      const decimalPart = strValue.includes('.') ? strValue.split('.')[1] : ''
      
      // Find the position of the last non-zero digit
      let lastNonZeroPos = -1
      for (let i = decimalPart.length - 1; i >= 0; i--) {
        if (decimalPart[i] !== '0') {
          lastNonZeroPos = i
          break
        }
      }
      
      if (lastNonZeroPos >= 0) {
        // Set precision to include up to the last non-zero digit
        // Add 1 because array is 0-indexed but decimal places start at 1
        precision = lastNonZeroPos + 1
        
        // Ensure we have at least 2 decimal places for consistency
        precision = Math.max(precision, 2)
        
        // Cap at a reasonable maximum to avoid excessive precision
        precision = Math.min(precision, 8)
      } else {
        // Default to 2 decimal places if we couldn't find a non-zero digit
        precision = 2
      }
    }
  }
  
  // Format with appropriate precision
  let formatted = absValue.toFixed(precision)
  
  // Add commas for thousands if requested
  if (showCommas) {
    // Split the number at the decimal point
    const parts = formatted.split('.')
    // Add commas to the whole number part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    // Rejoin with decimal part if it exists
    formatted = parts.join('.')
  }
  
  // Add dollar sign and handle negative sign
  return isNegative ? `-$${formatted}` : `$${formatted}`
}

/**
 * Formats a percentage value with adaptive precision based on magnitude:
 * - 2 decimal places for values < 10 (e.g., 0.12%)
 * - 1 decimal place for values between 10 and 999 (e.g., 12.3%, 123.4%)
 * - 0 decimal places for values >= 1000 (e.g., 1234%)
 * 
 * @param value The percentage value to format
 * @param forcePrecision If provided, overrides adaptive precision and uses this exact precision
 * @returns Formatted percentage string with % sign
 */
export function formatPercent(
  value: number | string,
  forcePrecision?: number
): string {
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  // Handle NaN, undefined, etc.
  if (num === null || num === undefined || isNaN(num)) {
    return '0%'
  }
  
  // Determine precision based on magnitude or use forced precision
  let precision: number
  
  if (forcePrecision !== undefined) {
    precision = forcePrecision
  } else {
    const absValue = Math.abs(num)
    precision = 2 // Default for small numbers
    
    // Determine precision based on magnitude
    if (absValue >= 1000) {
      precision = 0  // No decimals for 4+ digits
    } else if (absValue >= 10) {
      precision = 1  // 1 decimal for 2-3 digits
    }
  }
  
  // Format with appropriate precision
  const formatted = num.toFixed(precision)
  
  // Add percentage sign
  return `${formatted}%`
}
