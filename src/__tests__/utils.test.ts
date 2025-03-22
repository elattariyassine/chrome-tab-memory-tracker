import { vi, describe, it, expect } from 'vitest';
import { formatMemory, formatTimestamp } from '../utils';

describe('Utility Functions', () => {
  describe('formatMemory', () => {
    it('should format memory usage in MB when less than 1GB', () => {
      expect(formatMemory(500)).toBe('500 MB');
      expect(formatMemory(999)).toBe('999 MB');
      expect(formatMemory(0.5)).toBe('1 MB');
    });

    it('should format memory usage in GB when greater than or equal to 1GB', () => {
      expect(formatMemory(1024)).toBe('1.0 GB');
      expect(formatMemory(2048)).toBe('2.0 GB');
      expect(formatMemory(1536)).toBe('1.5 GB');
    });

    it('should handle zero memory usage', () => {
      expect(formatMemory(0)).toBe('0 MB');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const date = new Date('2024-03-22T12:00:00Z');
      vi.setSystemTime(date);
      
      expect(formatTimestamp(date.getTime())).toBe('12:00:00');
    });

    it('should handle invalid timestamps', () => {
      expect(formatTimestamp(NaN)).toBe('Invalid Date');
    });
  });
}); 