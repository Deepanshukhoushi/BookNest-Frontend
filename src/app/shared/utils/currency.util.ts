/**
 * Formats a number to USD currency.
 */
export function formatCurrency(amount: number): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
