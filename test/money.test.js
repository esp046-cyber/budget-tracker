const { Money } = require('../app.js');

describe('Money Helper', () => {
  describe('add', () => {
    test('should correctly add two numbers with precision', () => {
      // Test floating point precision issues
      expect(Money.add(0.1, 0.2)).toBe(0.3);
      expect(Money.add(0.01, 0.02)).toBe(0.03);
    });

    test('should handle large numbers', () => {
      expect(Money.add(1000000.50, 250000.75)).toBe(1250001.25);
    });

    test('should handle negative numbers', () => {
      expect(Money.add(-10.50, 5.25)).toBe(-5.25);
    });

    test('should handle zero values', () => {
      expect(Money.add(0, 0)).toBe(0);
      expect(Money.add(10, 0)).toBe(10);
    });
  });

  describe('subtract', () => {
    test('should correctly subtract numbers with precision', () => {
      expect(Money.subtract(0.3, 0.1)).toBe(0.2);
      expect(Money.subtract(1.00, 0.99)).toBe(0.01);
    });

    test('should handle negative results', () => {
      expect(Money.subtract(10, 20)).toBe(-10);
    });

    test('should handle zero values', () => {
      expect(Money.subtract(0, 0)).toBe(0);
      expect(Money.subtract(10, 10)).toBe(0);
    });
  });
});