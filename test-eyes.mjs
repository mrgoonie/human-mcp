import fs from 'fs';
import path from 'path';

// Test if the screenshot file exists and analyze it
const screenshotPath = 'screenshots/CleanShot 2025-09-15 at 13.43.58@2x.png';

if (fs.existsSync(screenshotPath)) {
  console.log('Screenshot file exists');
  const stats = fs.statSync(screenshotPath);
  console.log('File size:', stats.size, 'bytes');
  
  console.log('\nBasic file analysis:');
  console.log('File: CleanShot 2025-09-15 at 13.43.58@2x.png');
  console.log('This appears to be a screenshot taken with CleanShot on September 15, 2025 at 13:43:58');
  console.log('The @2x indicates it was taken on a high-DPI (Retina) display');
  console.log('File size is', Math.round(stats.size/1024), 'KB');
  
  // Let's try to identify basic image properties using Buffer to check image header
  const buffer = fs.readFileSync(screenshotPath);
  const header = buffer.slice(0, 8);
  
  // Check PNG signature
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    console.log('Confirmed: PNG image format');
    
    // Extract PNG dimensions from IHDR chunk (bytes 16-23)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log('Image dimensions:', width, 'x', height, 'pixels');
  }
} else {
  console.log('Screenshot file not found at:', screenshotPath);
}
