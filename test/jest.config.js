module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testMatch: ['**/test/**/*.test.js'],
  moduleNameMapping: {
    '\\.(css|less|scss)$': '<rootDir>/test/__mocks__/styleMock.js'
  }
};