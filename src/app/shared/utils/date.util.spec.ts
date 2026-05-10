import { describe, it, expect } from 'vitest';
import { formatDate } from './date.util';

describe('DateUtil', () => {
  it('should format date strings', () => {
    const result = formatDate('2024-10-12');
    expect(result).toMatch(/Oct 12, 2024/);
  });

  it('should format Date objects', () => {
    const result = formatDate(new Date(2024, 9, 12)); // Oct is 9
    expect(result).toMatch(/Oct 12, 2024/);
  });

  it('should handle undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });
});
