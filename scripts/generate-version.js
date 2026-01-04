#!/usr/bin/env node
/**
 * Generate version.ts file with version from package.json
 * This runs during build time to inject the version without requiring package.json at runtime
 */

const fs = require('fs');
const path = require('path');

// Read version from root package.json
const packageJson = require('../package.json');
const version = packageJson.version;

// Get database version from environment or use default
const dbVersion = process.env._DB_VERSION || '202101';

// Generate TypeScript content
const content = `// Auto-generated file - do not edit manually
// Generated at build time from package.json

export const VERSION = '${version}';
export const DB_VERSION = '${dbVersion}';
`;

// Write to server/routes directory
const outputPath = path.join(__dirname, '../server/routes/version-info.ts');

// Only write if content has changed to avoid triggering nodemon restarts
let shouldWrite = true;
if (fs.existsSync(outputPath)) {
  const existingContent = fs.readFileSync(outputPath, 'utf8');
  if (existingContent === content) {
    shouldWrite = false;
  }
}

if (shouldWrite) {
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`✓ Generated version-info.ts with version ${version}`);
} else {
  console.log(`✓ version-info.ts unchanged (version ${version})`);
}
