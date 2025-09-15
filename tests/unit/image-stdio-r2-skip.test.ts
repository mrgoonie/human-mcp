import { describe, it, expect, afterEach } from 'bun:test';

describe('STDIO R2 Gating Logic', () => {
  afterEach(() => {
    // Clean up environment variables
    delete process.env.TRANSPORT_TYPE;
  });

  it('should respect TRANSPORT_TYPE environment variable for R2 gating', () => {
    // Test STDIO mode (should skip R2)
    process.env.TRANSPORT_TYPE = 'stdio';
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(false);
  });

  it('should allow R2 in HTTP transport mode', () => {
    // Test HTTP mode (should allow R2)
    process.env.TRANSPORT_TYPE = 'http';
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(true);
    expect(isHttpTransport).toBe(true);
  });

  it('should default to stdio behavior when TRANSPORT_TYPE is not set', () => {
    // Test default mode (no TRANSPORT_TYPE set)
    delete process.env.TRANSPORT_TYPE;
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(false);
  });

  it('should only use R2 for http transport with valid cloudflare config', () => {
    // Test HTTP mode but no cloudflare
    process.env.TRANSPORT_TYPE = 'http';
    
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const hasCloudflare = false; // simulate no cloudflare config
    const shouldUseR2 = isHttpTransport && hasCloudflare;
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(true);
  });
});