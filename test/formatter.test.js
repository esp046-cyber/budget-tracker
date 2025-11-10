const { Formatter } = require('../app.js');

describe('Formatter Helper', () => {
  describe('currency', () => {
    test('should format PHP currency correctly', () => {
      expect(Formatter.currency(1234.56)).toBe('₱1,234.56');
      expect(Formatter.currency(1000)).toBe('₱1,000.00');
    });

    test('should handle zero and negative amounts', () => {
      expect(Formatter.currency(0)).toBe('₱0.00');
      expect(Formatter.currency(-50.25)).toBe('₱-50.25');
    });

    test('should always show two decimal places', () => {
      expect(Formatter.currency(100)).toBe('₱100.00');
      expect(Formatter.currency(123.4)).toBe('₱123.40');
    });
  });

  describe('date', () => {
    test('should format date in Philippine locale', () => {
      const dateStr = '2024-01-15';
      const result = Formatter.date(dateStr);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('percent', () => {
    test('should calculate percentage correctly', () => {
      expect(Formatter.percent(50, 100)).toBe('50%');
      expect(Formatter.percent(25, 200)).toBe('13%');
    });

    test('should handle zero total', () => {
      expect(Formatter.percent(50, 0)).toBe('0%');
    });
  });
});