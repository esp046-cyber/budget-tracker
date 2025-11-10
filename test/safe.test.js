const { Safe } = require('../app.js');

describe('Safe Helper', () => {
  describe('sanitize', () => {
    test('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = Safe.sanitize(input);
      expect(result).toBe('scriptalert(xss)/script'); // This is the CORRECT expected value
    });

    test('should trim and limit length', () => {
      const input = '   ' + 'a'.repeat(60) + '   ';
      const result = Safe.sanitize(input);
      expect(result.length).toBe(50);
      expect(result).toBe('a'.repeat(50));
    });

    test('should return non-strings as-is', () => {
      expect(Safe.sanitize(123)).toBe(123);
      expect(Safe.sanitize(null)).toBe(null);
      expect(Safe.sanitize(undefined)).toBe(undefined);
    });
  });
});