/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", { sourceMaps: "inline" }],
    // "^.+\\.(t|j)sx?$": ["ts-jest", { sourceMaps: "inline" }],
    // "^.+\\.jsx?$": "babel-jest",
    // "^.+\\.tsx?$": "ts-jest",
  },
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).?(m)[jt]s?(x)"],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "mjs"],
  setupFiles: ["./tests/setupTests.ts"],
};
