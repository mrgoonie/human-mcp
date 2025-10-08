#!/usr/bin/env node

/**
 * Post-install script for @goonnguyen/human-mcp
 * Ensures Playwright browsers are installed after package installation
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function installPlaywrightBrowsers() {
  try {
    console.log('🔧 Installing Playwright Chromium browser...');

    // Install only Chromium browser (not all browsers)
    await execAsync('npx playwright install chromium', {
      stdio: 'inherit'
    });

    console.log('✅ Playwright Chromium browser installed successfully');
  } catch (error) {
    console.warn('⚠️  Warning: Failed to install Playwright browser automatically');
    console.warn('   You may need to run: npx playwright install chromium');
    console.warn('   Error:', error.message);
    // Don't fail the installation if browser install fails
  }
}

// Only run if this is not a CI environment
if (!process.env.CI && !process.env.SKIP_PLAYWRIGHT_INSTALL) {
  installPlaywrightBrowsers();
}
