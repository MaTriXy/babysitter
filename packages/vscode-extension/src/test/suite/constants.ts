// Reuse the manifest publisher/name so tests stay in sync with the VS Code ID.
const packageJson = require('../../../package.json') as {
  publisher: string;
  name: string;
};

export const EXTENSION_ID = `${packageJson.publisher}.${packageJson.name}`;
