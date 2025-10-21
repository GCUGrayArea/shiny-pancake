const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/jest.env.mock.js',
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo-sqlite|@react-native|react-native|@react-native-community)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

module.exports = {
  ...baseConfig,
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: ['/node_modules/', '/integration/'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
      testTimeout: 30000,
    },
  ],
};
