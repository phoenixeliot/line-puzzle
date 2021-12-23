/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
    // "^.+\\.sx?$": "babel-jest",
    // "^.+\\.tsx?$": "ts-jest",
  },
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).?(m)[jt]s?(x)"],
  moduleFileExtensions: ["js", "jsx", "ts", "mjs"],
  setupFiles: ["./tests/setupTests.ts"],
};
