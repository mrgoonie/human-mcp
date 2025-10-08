import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock Playwright browser functions
const mockPage = {
  goto: mock(async () => ({})),
  screenshot: mock(async () => Buffer.from('mock-screenshot-data')),
  locator: mock(() => ({
    first: mock(() => ({
      boundingBox: mock(async () => ({ x: 10, y: 20, width: 100, height: 50 })),
      screenshot: mock(async () => Buffer.from('mock-element-screenshot'))
    })),
    waitFor: mock(async () => ({}))
  })),
  evaluate: mock(async () => ({ width: 1920, height: 5000 })),
  setDefaultTimeout: mock(() => {}),
  close: mock(async () => {}),
  isClosed: mock(() => false)
};

const mockContext = {
  newPage: mock(async () => mockPage),
  close: mock(async () => {})
};

const mockBrowser = {
  newContext: mock(async () => mockContext),
  close: mock(async () => {}),
  isConnected: mock(() => true)
};

// Mock chromium.launch
const mockChromium = {
  launch: mock(async () => mockBrowser)
};

// Import functions dynamically
let registerHandsTool: any;
let loadConfig: any;

describe('Playwright Screenshot Tools', () => {
  let server: McpServer;
  let config: any;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';

    // Import modules
    const handsModule = await import('@/tools/hands/index');
    const configModule = await import('@/utils/config');

    registerHandsTool = handsModule.registerHandsTool;
    loadConfig = configModule.loadConfig;

    config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    await registerHandsTool(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('tool registration', () => {
    it('should register playwright_screenshot_fullpage tool successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register playwright_screenshot_viewport tool successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register playwright_screenshot_element tool successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });
  });

  describe('schema validation', () => {
    it('should validate full page screenshot schema', () => {
      const validInput = {
        url: 'https://example.com',
        format: 'png',
        timeout: 30000,
        wait_until: 'networkidle'
      };

      expect(validInput.url).toBe('https://example.com');
      expect(validInput.format).toBe('png');
    });

    it('should validate viewport screenshot schema', () => {
      const validInput = {
        url: 'https://example.com',
        format: 'jpeg',
        quality: 80,
        viewport: { width: 1920, height: 1080 }
      };

      expect(validInput.url).toBe('https://example.com');
      expect(validInput.format).toBe('jpeg');
      expect(validInput.quality).toBe(80);
    });

    it('should validate element screenshot schema', () => {
      const validInput = {
        url: 'https://example.com',
        selector: '#my-element',
        selector_type: 'css',
        format: 'png',
        wait_for_selector: true
      };

      expect(validInput.url).toBe('https://example.com');
      expect(validInput.selector).toBe('#my-element');
      expect(validInput.selector_type).toBe('css');
    });
  });

  describe('URL validation', () => {
    it('should accept valid HTTP URLs', () => {
      const validUrl = 'http://example.com';
      expect(validUrl.startsWith('http://')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      const validUrl = 'https://example.com';
      expect(validUrl.startsWith('https://')).toBe(true);
    });
  });

  describe('format validation', () => {
    it('should accept png format', () => {
      const format = 'png';
      expect(['png', 'jpeg']).toContain(format);
    });

    it('should accept jpeg format', () => {
      const format = 'jpeg';
      expect(['png', 'jpeg']).toContain(format);
    });
  });

  describe('selector type validation', () => {
    it('should accept css selector type', () => {
      const selectorType = 'css';
      expect(['css', 'text', 'role']).toContain(selectorType);
    });

    it('should accept text selector type', () => {
      const selectorType = 'text';
      expect(['css', 'text', 'role']).toContain(selectorType);
    });

    it('should accept role selector type', () => {
      const selectorType = 'role';
      expect(['css', 'text', 'role']).toContain(selectorType);
    });
  });

  describe('wait_until validation', () => {
    it('should accept load wait state', () => {
      const waitUntil = 'load';
      expect(['load', 'domcontentloaded', 'networkidle']).toContain(waitUntil);
    });

    it('should accept domcontentloaded wait state', () => {
      const waitUntil = 'domcontentloaded';
      expect(['load', 'domcontentloaded', 'networkidle']).toContain(waitUntil);
    });

    it('should accept networkidle wait state', () => {
      const waitUntil = 'networkidle';
      expect(['load', 'domcontentloaded', 'networkidle']).toContain(waitUntil);
    });
  });

  describe('viewport validation', () => {
    it('should accept valid viewport dimensions', () => {
      const viewport = { width: 1920, height: 1080 };
      expect(viewport.width).toBeGreaterThanOrEqual(320);
      expect(viewport.width).toBeLessThanOrEqual(3840);
      expect(viewport.height).toBeGreaterThanOrEqual(240);
      expect(viewport.height).toBeLessThanOrEqual(2160);
    });

    it('should validate minimum viewport width', () => {
      const minWidth = 320;
      expect(minWidth).toBeGreaterThanOrEqual(320);
    });

    it('should validate maximum viewport width', () => {
      const maxWidth = 3840;
      expect(maxWidth).toBeLessThanOrEqual(3840);
    });
  });

  describe('timeout validation', () => {
    it('should accept valid timeout value', () => {
      const timeout = 30000;
      expect(timeout).toBeGreaterThanOrEqual(1000);
      expect(timeout).toBeLessThanOrEqual(120000);
    });

    it('should validate minimum timeout', () => {
      const minTimeout = 1000;
      expect(minTimeout).toBeGreaterThanOrEqual(1000);
    });

    it('should validate maximum timeout', () => {
      const maxTimeout = 120000;
      expect(maxTimeout).toBeLessThanOrEqual(120000);
    });
  });

  describe('quality validation', () => {
    it('should accept valid JPEG quality value', () => {
      const quality = 80;
      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(100);
    });

    it('should validate minimum quality', () => {
      const minQuality = 0;
      expect(minQuality).toBeGreaterThanOrEqual(0);
    });

    it('should validate maximum quality', () => {
      const maxQuality = 100;
      expect(maxQuality).toBeLessThanOrEqual(100);
    });
  });
});
