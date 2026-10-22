const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  moduleNameMapper: {
    ...jestConfig.moduleNameMapper,
    // Base components that sfdx-lwc-jest does not stub yet.
    "^lightning/uiEmbedding$":
      "<rootDir>/jest-mocks/lightning/uiEmbedding/uiEmbedding"
  },
  setupFilesAfterEnv: [
    ...(jestConfig.setupFilesAfterEnv || []),
    "<rootDir>/jest-sa11y-setup.js"
  ],
  // UI bundles bring their own runners (Vitest, Angular unit-test, Playwright).
  testPathIgnorePatterns: [
    ...(jestConfig.testPathIgnorePatterns || []),
    "<rootDir>/force-app/main/default/uiBundles/"
  ],
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"]
};
