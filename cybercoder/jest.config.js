/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.stories.{ts,tsx}',
    '!packages/*/src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/packages/shared/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/packages/shared/test/setup.ts']
    },
    {
      displayName: 'cli',
      testMatch: ['<rootDir>/packages/cli/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/packages/cli/test/setup.ts']
    },
    {
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/packages/core/test/setup.ts']
    }
  ],
  moduleNameMapping: {
    '^@cybermind/(.*)$': '<rootDir>/packages/$1/src'
  }
};
