import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import {
  launchBrowser,
  closeBrowser,
  navigateToUrl,
  waitForElement,
  validateUrl,
  bufferToBase64DataUri,
  getMimeType,
  type BrowserInstance
} from "../utils/playwright-helpers.js";

export interface FullPageScreenshotOptions {
  url: string;
  format?: "png" | "jpeg";
  quality?: number;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  viewport?: { width: number; height: number };
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface FullPageScreenshotResult {
  screenshot: string;
  format: string;
  url: string;
  viewport: { width: number; height: number };
  fullPageDimensions?: { width: number; height: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface ViewportScreenshotOptions {
  url: string;
  format?: "png" | "jpeg";
  quality?: number;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  viewport?: { width: number; height: number };
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface ViewportScreenshotResult {
  screenshot: string;
  format: string;
  url: string;
  viewport: { width: number; height: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface ElementScreenshotOptions {
  url: string;
  selector: string;
  selectorType?: "css" | "text" | "role";
  format?: "png" | "jpeg";
  quality?: number;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  viewport?: { width: number; height: number };
  waitForSelector?: boolean;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface ElementScreenshotResult {
  screenshot: string;
  format: string;
  url: string;
  selector: string;
  selectorType: string;
  elementDimensions?: { width: number; height: number; x: number; y: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

/**
 * Capture full page screenshot including scrollable content
 */
export async function captureFullPageScreenshot(
  options: FullPageScreenshotOptions,
  config?: Config
): Promise<FullPageScreenshotResult> {
  const startTime = Date.now();
  let browserInstance: BrowserInstance | null = null;

  try {
    // Validate and sanitize URL
    const validatedUrl = validateUrl(options.url);
    logger.info(`Capturing full page screenshot of: ${validatedUrl}`);

    // Launch browser
    browserInstance = await launchBrowser({
      viewport: options.viewport || { width: 1920, height: 1080 },
      timeout: options.timeout || 30000
    });

    const { page } = browserInstance;

    // Navigate to URL
    await navigateToUrl(page, validatedUrl, {
      waitUntil: options.waitUntil || "networkidle",
      timeout: options.timeout || 30000
    });

    // Capture full page screenshot
    const format = options.format || "png";
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: format,
      quality: format === "jpeg" ? options.quality || 80 : undefined
    });

    logger.info(`Full page screenshot captured successfully`);

    // Get page dimensions
    const dimensions = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document;
      return {
        width: doc.documentElement.scrollWidth,
        height: doc.documentElement.scrollHeight
      };
    });

    // Convert to base64
    const mimeType = getMimeType(format);
    const screenshot = bufferToBase64DataUri(screenshotBuffer, mimeType);

    const processingTime = Date.now() - startTime;

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = screenshot.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? screenshot.replace(/^data:image\/[^;]+;base64,/, '');

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'playwright-fullpage',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Full page screenshot saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save screenshot: ${error}. Returning base64 only.`);
      }
    }

    return {
      screenshot,
      format,
      url: validatedUrl,
      viewport: options.viewport || { width: 1920, height: 1080 },
      fullPageDimensions: dimensions,
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Full page screenshot failed after ${processingTime}ms:`, error);

    throw new Error(
      `Full page screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Always cleanup browser
    if (browserInstance) {
      await closeBrowser(browserInstance);
    }
  }
}

/**
 * Capture viewport screenshot (visible area only)
 */
export async function captureViewportScreenshot(
  options: ViewportScreenshotOptions,
  config?: Config
): Promise<ViewportScreenshotResult> {
  const startTime = Date.now();
  let browserInstance: BrowserInstance | null = null;

  try {
    // Validate and sanitize URL
    const validatedUrl = validateUrl(options.url);
    logger.info(`Capturing viewport screenshot of: ${validatedUrl}`);

    // Launch browser
    browserInstance = await launchBrowser({
      viewport: options.viewport || { width: 1920, height: 1080 },
      timeout: options.timeout || 30000
    });

    const { page } = browserInstance;

    // Navigate to URL
    await navigateToUrl(page, validatedUrl, {
      waitUntil: options.waitUntil || "networkidle",
      timeout: options.timeout || 30000
    });

    // Capture viewport screenshot
    const format = options.format || "png";
    const screenshotBuffer = await page.screenshot({
      fullPage: false, // Only capture visible viewport
      type: format,
      quality: format === "jpeg" ? options.quality || 80 : undefined
    });

    logger.info(`Viewport screenshot captured successfully`);

    // Convert to base64
    const mimeType = getMimeType(format);
    const screenshot = bufferToBase64DataUri(screenshotBuffer, mimeType);

    const processingTime = Date.now() - startTime;

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = screenshot.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? screenshot.replace(/^data:image\/[^;]+;base64,/, '');

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'playwright-viewport',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Viewport screenshot saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save screenshot: ${error}. Returning base64 only.`);
      }
    }

    return {
      screenshot,
      format,
      url: validatedUrl,
      viewport: options.viewport || { width: 1920, height: 1080 },
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Viewport screenshot failed after ${processingTime}ms:`, error);

    throw new Error(
      `Viewport screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Always cleanup browser
    if (browserInstance) {
      await closeBrowser(browserInstance);
    }
  }
}

/**
 * Capture screenshot of specific element
 */
export async function captureElementScreenshot(
  options: ElementScreenshotOptions,
  config?: Config
): Promise<ElementScreenshotResult> {
  const startTime = Date.now();
  let browserInstance: BrowserInstance | null = null;

  try {
    // Validate and sanitize URL
    const validatedUrl = validateUrl(options.url);
    const selectorType = options.selectorType || "css";
    logger.info(`Capturing element screenshot of: ${validatedUrl}, selector: ${options.selector} (${selectorType})`);

    // Launch browser
    browserInstance = await launchBrowser({
      viewport: options.viewport || { width: 1920, height: 1080 },
      timeout: options.timeout || 30000
    });

    const { page } = browserInstance;

    // Navigate to URL
    await navigateToUrl(page, validatedUrl, {
      waitUntil: options.waitUntil || "networkidle",
      timeout: options.timeout || 30000
    });

    // Wait for element if requested
    const shouldWaitForSelector = options.waitForSelector !== false;
    if (shouldWaitForSelector) {
      await waitForElement(page, options.selector, {
        selectorType,
        timeout: options.timeout || 30000,
        state: "visible"
      });
    }

    // Build the full selector
    let fullSelector: string;
    switch (selectorType) {
      case "text":
        fullSelector = `text=${options.selector}`;
        break;
      case "role":
        fullSelector = `role=${options.selector}`;
        break;
      case "css":
      default:
        fullSelector = options.selector;
    }

    // Locate element
    const element = page.locator(fullSelector).first();

    // Get element bounding box
    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      throw new Error(`Element not found or not visible: ${options.selector}`);
    }

    // Capture element screenshot
    const format = options.format || "png";
    const screenshotBuffer = await element.screenshot({
      type: format,
      quality: format === "jpeg" ? options.quality || 80 : undefined
    });

    logger.info(`Element screenshot captured successfully`);

    // Convert to base64
    const mimeType = getMimeType(format);
    const screenshot = bufferToBase64DataUri(screenshotBuffer, mimeType);

    const processingTime = Date.now() - startTime;

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = screenshot.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? screenshot.replace(/^data:image\/[^;]+;base64,/, '');

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'playwright-element',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Element screenshot saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save screenshot: ${error}. Returning base64 only.`);
      }
    }

    return {
      screenshot,
      format,
      url: validatedUrl,
      selector: options.selector,
      selectorType,
      elementDimensions: {
        width: Math.round(boundingBox.width),
        height: Math.round(boundingBox.height),
        x: Math.round(boundingBox.x),
        y: Math.round(boundingBox.y)
      },
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Element screenshot failed after ${processingTime}ms:`, error);

    throw new Error(
      `Element screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Always cleanup browser
    if (browserInstance) {
      await closeBrowser(browserInstance);
    }
  }
}
