import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decodeJwtPayload, isTokenExpired } from './jwt.utils';

describe('JwtUtils', () => {
  describe('decodeJwtPayload', () => {
    it('should return null for invalid token format', () => {
      expect(decodeJwtPayload('invalid-token')).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
    });

    it('should decode valid JWT payload', () => {
      // Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
      const token = 'header.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature';
      const payload = decodeJwtPayload(token);
      expect(payload).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022
      });
    });

    it('should handle base64url padding correctly', () => {
      // Payload: {"userId":1} -> eyJ1c2VySWQiOjF9 (needs padding)
      const token = 'header.eyJ1c2VySWQiOjF9.signature';
      const payload = decodeJwtPayload(token);
      expect(payload).toEqual({ userId: 1 });
    });

    it('should return null if payload is not valid JSON', () => {
      const token = 'header.bm90LWpzb24.signature'; // "not-json"
      expect(decodeJwtPayload(token)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true if token is expired', () => {
      const now = Date.now();
      const exp = Math.floor(now / 1000) - 60; // 1 minute ago
      const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
      
      vi.setSystemTime(now);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false if token is not expired', () => {
      const now = Date.now();
      const exp = Math.floor(now / 1000) + 3600; // 1 hour from now
      const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
      
      vi.setSystemTime(now);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return false if exp claim is missing', () => {
      const token = `header.${btoa(JSON.stringify({ sub: '123' }))}.signature`;
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return false if token is invalid', () => {
      expect(isTokenExpired('invalid')).toBe(false);
    });
  });
});
