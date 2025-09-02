#!/usr/bin/env node

// Workaround for eventsource ESM import issues
import { createRequire } from 'module';
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);

// Try to fix the eventsource import by patching the module resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'eventsource' && parent?.filename?.includes('@modelcontextprotocol/inspector')) {
    // Force CommonJS resolution for eventsource
    return require.resolve('eventsource');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Run the inspector with the command line args
const args = process.argv.slice(2);
const child = spawn('npx', ['@modelcontextprotocol/inspector', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--loader ./inspector-loader.mjs'
  }
});

child.on('close', (code) => {
  process.exit(code);
});