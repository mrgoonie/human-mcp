const fs = require('fs');
const path = require('path');

// Test if the screenshot file exists and analyze it
const screenshotPath = 'screenshots/CleanShot 2025-09-15 at 13.43.58@2x.png';

if (fs.existsSync(screenshotPath)) {
  console.log('Screenshot file exists');
  const stats = fs.statSync(screenshotPath);
  console.log('File size:', stats.size, 'bytes');
  
  // Try to create a simple test
  console.log('Creating test analysis...');
  
  // For now, let's just analyze what we can see in the filename
  console.log('Analysis of screenshot: CleanShot 2025-09-15 at 13.43.58@2x.png');
  console.log('This appears to be a screenshot taken with CleanShot on September 15, 2025 at 13:43:58');
  console.log('The @2x indicates it was taken on a high-DPI (Retina) display');
  console.log('File size is', Math.round(stats.size/1024), 'KB');
} else {
  console.log('Screenshot file not found');
}
