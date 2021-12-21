/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testEnvironment: "node",
  // testRegex: ["/tests/.*test.m?js"],
  // testMatch: ["**/?(*.)+(spec|test).?(m)[tj]s(x)?", "**/*.mjs"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).?(m)[jt]s?(x)"],
  moduleFileExtensions: ["js", "jsx", "ts", "mjs"],
  setupFiles: ["./tests/setupTests.ts"],
};
