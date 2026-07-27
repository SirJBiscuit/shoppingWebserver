/**
 * Format quantity for display
 * Converts 1.00 -> x1, 2.50 -> x2.5, etc.
 */
export const formatQuantity = (qty) => {
  if (qty === null || qty === undefined || qty === '') return '';
  
  const num = parseFloat(qty);
  
  if (isNaN(num)) return qty;
  
  // If it's a whole number, show as integer
  if (num % 1 === 0) {
    return `x${Math.floor(num)}`;
  }
  
  // Otherwise show with minimal decimals (remove trailing zeros)
  return `x${num.toFixed(2).replace(/\.?0+$/, '')}`;
};

/**
 * Format quantity without the 'x' prefix
 */
export const formatQuantityPlain = (qty) => {
  if (qty === null || qty === undefined || qty === '') return '';
  
  const num = parseFloat(qty);
  
  if (isNaN(num)) return qty;
  
  // If it's a whole number, show as integer
  if (num % 1 === 0) {
    return Math.floor(num).toString();
  }
  
  // Otherwise show with minimal decimals (remove trailing zeros)
  return num.toFixed(2).replace(/\.?0+$/, '');
};
