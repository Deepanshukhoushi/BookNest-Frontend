import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency.util';
import { formatDate } from './date.util';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format numbers to USD', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle null/undefined', () => {
      expect(formatCurrency(null as any)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      const date = '2024-10-12';
      expect(formatDate(date)).toBe('Oct 12, 2024');
    });

    it('should format Date objects correctly', () => {
      const date = new Date(2023, 0, 1);
      expect(formatDate(date)).toBe('Jan 1, 2023');
    });

    it('should return empty string for falsy input', () => {
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });
  });
});
