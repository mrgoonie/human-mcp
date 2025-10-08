import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { logger } from "@/utils/logger.js";

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Launch browser and create a new page
 */
export async function launchBrowser(options?: {
  viewport?: { width: number; height: number };
  timeout?: number;
  userAgent?: string;
}): Promise<BrowserInstance> {
  try {
    logger.info("Launching Chromium browser...");

    const browser = await chromium.launch({
      headless: true,
      timeout: options?.timeout || 30000
    });

    const context = await browser.newContext({
      viewport: options?.viewport || { width: 1920, height: 1080 },
      userAgent: options?.userAgent
    });

    const page = await context.newPage();

    // Set default timeout for page operations
    page.setDefaultTimeout(options?.timeout || 30000);

    logger.info("Browser launched successfully");

    return { browser, context, page };
  } catch (error) {
    logger.error(`Failed to launch browser: ${error}`);
    throw new Error(
      `Failed to launch browser: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Close browser and cleanup resources
 */
export async function closeBrowser(instance: BrowserInstance): Promise<void> {
  try {
    if (instance.page && !instance.page.isClosed()) {
      await instance.page.close();
    }
    if (instance.context) {
      await instance.context.close();
    }
    if (instance.browser && instance.browser.isConnected()) {
      await instance.browser.close();
    }
    logger.info("Browser closed successfully");
  } catch (error) {
    logger.error(`Error closing browser: ${error}`);
    // Don't throw here - cleanup errors shouldn't fail the operation
  }
}

/**
 * Navigate to URL with retry logic
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  options?: {
    waitUntil?: "load" | "domcontentloaded" | "networkidle";
    timeout?: number;
    retries?: number;
  }
): Promise<void> {
  const waitUntil = options?.waitUntil || "networkidle";
  const timeout = options?.timeout || 30000;
  const retries = options?.retries || 2;

  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      logger.info(`Navigating to ${url} (attempt ${i + 1}/${retries + 1})...`);

      await page.goto(url, {
        waitUntil,
        timeout
      });

      logger.info(`Successfully navigated to ${url}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Navigation attempt ${i + 1} failed: ${lastError.message}`);

      if (i < retries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw new Error(
    `Failed to navigate to ${url} after ${retries + 1} attempts: ${lastError?.message}`
  );
}

/**
 * Wait for element with custom selector types
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: {
    selectorType?: "css" | "text" | "role";
    timeout?: number;
    state?: "attached" | "detached" | "visible" | "hidden";
  }
): Promise<void> {
  const selectorType = options?.selectorType || "css";
  const timeout = options?.timeout || 30000;
  const state = options?.state || "visible";

  try {
    let fullSelector: string;

    switch (selectorType) {
      case "text":
        fullSelector = `text=${selector}`;
        break;
      case "role":
        fullSelector = `role=${selector}`;
        break;
      case "css":
      default:
        fullSelector = selector;
    }

    logger.info(`Waiting for element: ${fullSelector} (state: ${state})`);

    await page.locator(fullSelector).waitFor({
      state,
      timeout
    });

    logger.info(`Element found: ${fullSelector}`);
  } catch (error) {
    logger.error(`Failed to find element ${selector}: ${error}`);
    throw new Error(
      `Element not found: ${selector} (${error instanceof Error ? error.message : "Unknown error"})`
    );
  }
}

/**
 * Validate and sanitize URL
 */
export function validateUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Only http and https are allowed.`);
    }

    return parsedUrl.href;
  } catch (error) {
    throw new Error(
      `Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert buffer to base64 data URI
 */
export function bufferToBase64DataUri(buffer: Buffer, mimeType: string = "image/png"): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get MIME type from format
 */
export function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "image/png";
  }
}
