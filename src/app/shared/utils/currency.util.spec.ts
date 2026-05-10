import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency.util';

describe('CurrencyUtil', () => {
  it('should format positive amounts', () => {
    const result = formatCurrency(100);
    // Use regex to handle non-breaking spaces or other formatting nuances
    expect(result).toMatch(/\$100\.00/);
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
  });

  it('should handle null', () => {
    expect(formatCurrency(null as any)).toBe('$0.00');
  });
});
