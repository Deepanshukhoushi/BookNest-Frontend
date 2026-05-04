/**
 * Formats a date string or Date object to a readable format (e.g. Oct 12, 2024).
 */
export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}
