import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@hirestack/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.vercel/'],
};

export default config;
