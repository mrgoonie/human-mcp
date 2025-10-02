#!/usr/bin/env bun

/**
 * Comprehensive Test Suite for JIMP Image Editing Tools
 * Tests all 5 new tools with the cat.png test image
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cropImage, resizeImage, rotateImage, maskImage } from './src/tools/hands/processors/jimp-processor.js';
import { removeImageBackground } from './src/tools/hands/processors/background-remover.js';
import { logger } from './src/utils/logger.js';

const TEST_IMAGE_PATH = '/Users/duynguyen/www/human-mcp/tests/data/cat.png';
const OUTPUT_DIR = '/Users/duynguyen/www/human-mcp/test-outputs';

// Create output directory
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {
  // Directory already exists
}

interface TestResult {
  tool: string;
  testName: string;
  success: boolean;
  error?: string;
  executionTime?: number;
  outputFile?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Save base64 image to file
 */
function saveBase64Image(base64Data: string, filename: string): string {
  const matches = base64Data.match(/data:([^;]+);base64,(.+)/);
  if (!matches || !matches[2]) {
    throw new Error('Invalid base64 data');
  }

  const buffer = Buffer.from(matches[2], 'base64');
  const outputPath = join(OUTPUT_DIR, filename);
  writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * Test 1: jimp_crop_image with center mode
 */
async function testCropImage() {
  console.log('\n🧪 Test 1: jimp_crop_image (center mode, 300x300)');
  const startTime = Date.now();

  try {
    const result = await cropImage({
      inputImage: TEST_IMAGE_PATH,
      mode: 'center',
      width: 300,
      height: 300,
      outputFormat: 'png'
    });

    const executionTime = Date.now() - startTime;
    const outputFile = saveBase64Image(result.croppedImage, 'test-crop-center.png');

    console.log('✅ SUCCESS');
    console.log(`   Original: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    console.log(`   Cropped: ${result.croppedDimensions.width}x${result.croppedDimensions.height}`);
    console.log(`   Region: (${result.cropRegion.x}, ${result.cropRegion.y}, ${result.cropRegion.width}, ${result.cropRegion.height})`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Output: ${outputFile}`);

    results.push({
      tool: 'jimp_crop_image',
      testName: 'Center crop 300x300',
      success: true,
      executionTime,
      outputFile,
      details: result
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ FAILED:', error);

    results.push({
      tool: 'jimp_crop_image',
      testName: 'Center crop 300x300',
      success: false,
      error: String(error),
      executionTime
    });
  }
}

/**
 * Test 2: jimp_resize_image with aspect ratio maintenance
 */
async function testResizeImage() {
  console.log('\n🧪 Test 2: jimp_resize_image (width=400, maintain aspect ratio)');
  const startTime = Date.now();

  try {
    const result = await resizeImage({
      inputImage: TEST_IMAGE_PATH,
      width: 400,
      maintainAspectRatio: true,
      outputFormat: 'png'
    });

    const executionTime = Date.now() - startTime;
    const outputFile = saveBase64Image(result.resizedImage, 'test-resize-400.png');

    console.log('✅ SUCCESS');
    console.log(`   Original: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    console.log(`   Resized: ${result.resizedDimensions.width}x${result.resizedDimensions.height}`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Output: ${outputFile}`);

    results.push({
      tool: 'jimp_resize_image',
      testName: 'Resize to width 400 (maintain aspect ratio)',
      success: true,
      executionTime,
      outputFile,
      details: result
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ FAILED:', error);

    results.push({
      tool: 'jimp_resize_image',
      testName: 'Resize to width 400 (maintain aspect ratio)',
      success: false,
      error: String(error),
      executionTime
    });
  }
}

/**
 * Test 3: jimp_rotate_image with 45 degrees
 */
async function testRotateImage() {
  console.log('\n🧪 Test 3: jimp_rotate_image (45 degrees)');
  const startTime = Date.now();

  try {
    const result = await rotateImage({
      inputImage: TEST_IMAGE_PATH,
      angle: 45,
      outputFormat: 'png'
    });

    const executionTime = Date.now() - startTime;
    const outputFile = saveBase64Image(result.rotatedImage, 'test-rotate-45.png');

    console.log('✅ SUCCESS');
    console.log(`   Original: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    console.log(`   Rotated: ${result.rotatedDimensions.width}x${result.rotatedDimensions.height}`);
    console.log(`   Angle: ${result.angle}°`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Output: ${outputFile}`);

    results.push({
      tool: 'jimp_rotate_image',
      testName: 'Rotate 45 degrees',
      success: true,
      executionTime,
      outputFile,
      details: result
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ FAILED:', error);

    results.push({
      tool: 'jimp_rotate_image',
      testName: 'Rotate 45 degrees',
      success: false,
      error: String(error),
      executionTime
    });
  }
}

/**
 * Test 4: jimp_mask_image with overlay blend mode
 */
async function testMaskImage() {
  console.log('\n🧪 Test 4: jimp_mask_image (overlay blend mode)');
  const startTime = Date.now();

  try {
    const result = await maskImage({
      inputImage: TEST_IMAGE_PATH,
      maskImage: TEST_IMAGE_PATH, // Using same image as mask for testing
      blendMode: 'overlay',
      outputFormat: 'png'
    });

    const executionTime = Date.now() - startTime;
    const outputFile = saveBase64Image(result.maskedImage, 'test-mask-overlay.png');

    console.log('✅ SUCCESS');
    console.log(`   Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Output: ${outputFile}`);

    results.push({
      tool: 'jimp_mask_image',
      testName: 'Overlay blend mode',
      success: true,
      executionTime,
      outputFile,
      details: result
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ FAILED:', error);

    results.push({
      tool: 'jimp_mask_image',
      testName: 'Overlay blend mode',
      success: false,
      error: String(error),
      executionTime
    });
  }
}

/**
 * Test 5: rmbg_remove_background with balanced quality
 */
async function testRemoveBackground() {
  console.log('\n🧪 Test 5: rmbg_remove_background (balanced quality)');
  const startTime = Date.now();

  try {
    const result = await removeImageBackground({
      inputImage: TEST_IMAGE_PATH,
      quality: 'balanced',
      outputFormat: 'png'
    });

    const executionTime = Date.now() - startTime;
    const outputFile = saveBase64Image(result.imageWithoutBackground, 'test-remove-bg.png');

    console.log('✅ SUCCESS');
    console.log(`   Original Dimensions: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    console.log(`   Quality: ${result.quality}`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Output: ${outputFile}`);

    results.push({
      tool: 'rmbg_remove_background',
      testName: 'Background removal (balanced quality)',
      success: true,
      executionTime,
      outputFile,
      details: result
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ FAILED:', error);

    results.push({
      tool: 'rmbg_remove_background',
      testName: 'Background removal (balanced quality)',
      success: false,
      error: String(error),
      executionTime
    });
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(80) + '\n');

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const totalTests = results.length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${successCount} ✅`);
  console.log(`Failed: ${failureCount} ❌`);
  console.log(`Success Rate: ${((successCount / totalTests) * 100).toFixed(2)}%`);

  console.log('\n' + '-'.repeat(80));
  console.log('DETAILED RESULTS');
  console.log('-'.repeat(80) + '\n');

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const time = result.executionTime ? `${result.executionTime}ms` : 'N/A';

    console.log(`${index + 1}. ${status} ${result.tool}`);
    console.log(`   Test: ${result.testName}`);
    console.log(`   Execution Time: ${time}`);

    if (result.success && result.outputFile) {
      console.log(`   Output File: ${result.outputFile}`);
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log('');
  });

  // Save results to JSON
  const reportPath = join(OUTPUT_DIR, 'test-results.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📝 Detailed results saved to: ${reportPath}`);

  // Generate markdown report
  const mdReport = generateMarkdownReport(successCount, failureCount, totalTests);
  const mdReportPath = join(OUTPUT_DIR, 'test-report.md');
  writeFileSync(mdReportPath, mdReport);
  console.log(`📄 Markdown report saved to: ${mdReportPath}`);

  console.log('\n' + '='.repeat(80));
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(successCount: number, failureCount: number, totalTests: number): string {
  const timestamp = new Date().toISOString();
  const successRate = ((successCount / totalTests) * 100).toFixed(2);

  let md = `# JIMP Image Editing Tools Test Report\n\n`;
  md += `**Test Date:** ${timestamp}\n\n`;
  md += `**Test Image:** \`${TEST_IMAGE_PATH}\`\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${totalTests} |\n`;
  md += `| Passed | ${successCount} ✅ |\n`;
  md += `| Failed | ${failureCount} ❌ |\n`;
  md += `| Success Rate | ${successRate}% |\n\n`;

  md += `## Test Results\n\n`;

  results.forEach((result, index) => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const time = result.executionTime ? `${result.executionTime}ms` : 'N/A';

    md += `### ${index + 1}. ${result.tool}\n\n`;
    md += `- **Test:** ${result.testName}\n`;
    md += `- **Status:** ${status}\n`;
    md += `- **Execution Time:** ${time}\n`;

    if (result.success && result.outputFile) {
      md += `- **Output File:** \`${result.outputFile}\`\n`;
    }

    if (result.error) {
      md += `- **Error:** \`${result.error}\`\n`;
    }

    if (result.details) {
      md += `\n**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n`;
    }

    md += `\n`;
  });

  md += `## Recommendations\n\n`;

  if (failureCount === 0) {
    md += `✅ All tests passed successfully! The JIMP image editing tools are working as expected.\n\n`;
  } else {
    md += `⚠️ ${failureCount} test(s) failed. Please review the errors above and:\n\n`;
    md += `1. Check the error messages for specific failure reasons\n`;
    md += `2. Verify all dependencies are installed correctly\n`;
    md += `3. Ensure the test image is accessible\n`;
    md += `4. Review the tool implementations for any issues\n\n`;
  }

  md += `## Next Steps\n\n`;
  md += `1. Review the generated output images in \`${OUTPUT_DIR}\`\n`;
  md += `2. Verify the visual quality of the processed images\n`;
  md += `3. Test the tools via MCP inspector for integration testing\n`;
  md += `4. Add unit tests for edge cases and error handling\n`;

  return md;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 JIMP Image Editing Tools Test Suite');
  console.log('='.repeat(80));
  console.log(`Test Image: ${TEST_IMAGE_PATH}`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(80));

  await testCropImage();
  await testResizeImage();
  await testRotateImage();
  await testMaskImage();
  await testRemoveBackground();

  generateReport();

  // Exit with appropriate code
  const failureCount = results.filter(r => !r.success).length;
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
