import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  testPathPattern: "__tests__",
}

export default createJestConfig(config)
