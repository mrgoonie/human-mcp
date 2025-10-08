# Playwright Screenshot Tools Usage Guide

This guide provides comprehensive examples for using the three Playwright screenshot tools in Human MCP.

## Overview

Human MCP includes three Playwright-based screenshot tools for automated web page capture:

1. **playwright_screenshot_fullpage** - Captures entire page including scrollable content
2. **playwright_screenshot_viewport** - Captures only the visible viewport area
3. **playwright_screenshot_element** - Captures a specific element on the page

## Tool Comparison

| Feature | Full Page | Viewport | Element |
|---------|-----------|----------|---------|
| **Scrollable Content** | ✅ Included | ❌ Not included | ❌ Not included |
| **Specific Elements** | ❌ Whole page | ❌ Whole viewport | ✅ Single element |
| **File Size** | Larger | Smaller | Smallest |
| **Use Case** | Documentation, archival | Quick previews, testing | Bug reports, component focus |
| **Performance** | Slower (scrolls page) | Fast | Fast |

## Common Parameters

All three tools share these common parameters:

- **url** (required): The URL of the webpage to capture
- **format** (optional): `"png"` (default) or `"jpeg"`
- **quality** (optional): JPEG quality 0-100 (only for jpeg format)
- **timeout** (optional): Navigation timeout in milliseconds (default: 30000)
- **wait_until** (optional): When to consider navigation successful
  - `"load"` - Wait for load event
  - `"domcontentloaded"` - Wait for DOMContentLoaded event
  - `"networkidle"` (default) - Wait for network to be idle
- **viewport** (optional): Viewport dimensions
  - `width`: 320-3840 pixels (default: 1920)
  - `height`: 240-2160 pixels (default: 1080)

## playwright_screenshot_fullpage

### Basic Usage

```json
{
  "url": "https://example.com"
}
```

### Full Page with Custom Viewport

```json
{
  "url": "https://example.com/documentation",
  "format": "png",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "wait_until": "networkidle"
}
```

### High-Quality JPEG

```json
{
  "url": "https://example.com",
  "format": "jpeg",
  "quality": 95,
  "timeout": 60000
}
```

### Use Cases

- **Documentation**: Capture entire documentation pages
- **Archival**: Full page screenshots for record keeping
- **Long-form Content**: Articles, blog posts, dashboards
- **Visual Regression Testing**: Compare entire page layouts

## playwright_screenshot_viewport

### Basic Usage

```json
{
  "url": "https://example.com"
}
```

### Mobile Viewport (iPhone 13)

```json
{
  "url": "https://example.com",
  "viewport": {
    "width": 390,
    "height": 844
  },
  "format": "png"
}
```

### Tablet Viewport (iPad Pro)

```json
{
  "url": "https://example.com",
  "viewport": {
    "width": 1024,
    "height": 1366
  }
}
```

### Desktop 4K Viewport

```json
{
  "url": "https://example.com",
  "viewport": {
    "width": 3840,
    "height": 2160
  },
  "wait_until": "load"
}
```

### Use Cases

- **Responsive Design Testing**: Test different viewport sizes
- **Above-the-Fold Content**: Capture what users see first
- **Quick Previews**: Fast screenshots without scrolling
- **Performance Testing**: Smaller file sizes for faster processing

## playwright_screenshot_element

### Basic Usage with CSS Selector

```json
{
  "url": "https://example.com",
  "selector": ".main-content",
  "selector_type": "css"
}
```

### Using Text Selector

```json
{
  "url": "https://example.com",
  "selector": "Sign In",
  "selector_type": "text"
}
```

### Using Role Selector

```json
{
  "url": "https://example.com",
  "selector": "button[name='submit']",
  "selector_type": "role"
}
```

### Specific Component with Custom Settings

```json
{
  "url": "https://example.com/app",
  "selector": "#user-dashboard",
  "selector_type": "css",
  "format": "png",
  "wait_for_selector": true,
  "timeout": 45000
}
```

### Error Message Screenshot

```json
{
  "url": "https://example.com/form",
  "selector": ".error-message",
  "selector_type": "css",
  "wait_for_selector": true
}
```

### Use Cases

- **Bug Reports**: Capture specific error messages or UI glitches
- **Component Documentation**: Screenshot individual UI components
- **A/B Testing**: Compare specific elements across variants
- **Feature Highlighting**: Focus on particular features or sections

## Advanced Patterns

### Responsive Testing Workflow

```javascript
// Test multiple viewport sizes
const viewports = [
  { width: 375, height: 812, name: "iPhone 13" },
  { width: 390, height: 844, name: "iPhone 14" },
  { width: 768, height: 1024, name: "iPad" },
  { width: 1920, height: 1080, name: "Desktop" }
];

for (const viewport of viewports) {
  await playwright_screenshot_viewport({
    url: "https://example.com",
    viewport: viewport,
    format: "png"
  });
}
```

### Component Library Documentation

```javascript
// Capture all button variants
const selectors = [
  ".btn-primary",
  ".btn-secondary",
  ".btn-success",
  ".btn-danger"
];

for (const selector of selectors) {
  await playwright_screenshot_element({
    url: "https://example.com/components",
    selector: selector,
    selector_type: "css"
  });
}
```

### Error State Capture

```javascript
// Capture error states for debugging
await playwright_screenshot_element({
  url: "https://example.com/form?error=true",
  selector: ".validation-errors",
  selector_type: "css",
  wait_for_selector: true,
  timeout: 60000
});
```

## Selector Types Explained

### CSS Selector (`selector_type: "css"`)

Use standard CSS selectors:
- `".class-name"` - Class selector
- `"#element-id"` - ID selector
- `"div > p"` - Child combinator
- `"[data-test='button']"` - Attribute selector

### Text Selector (`selector_type: "text"`)

Matches elements containing specific text:
- `"Sign In"` - Exact text match
- `"Click here"` - Case-sensitive text

### Role Selector (`selector_type: "role"`)

Uses ARIA roles for accessibility:
- `"button"` - Button elements
- `"link"` - Link elements
- `"heading"` - Heading elements

## Best Practices

### 1. Wait Conditions

Choose the appropriate `wait_until` condition:

```json
{
  "url": "https://example.com",
  "wait_until": "networkidle"  // Best for dynamic content
}
```

- Use `"networkidle"` for pages with AJAX/dynamic content
- Use `"load"` for static pages
- Use `"domcontentloaded"` for fast captures

### 2. Timeout Configuration

Set appropriate timeouts based on page complexity:

```json
{
  "url": "https://slow-site.com",
  "timeout": 60000  // 60 seconds for slow pages
}
```

### 3. Format Selection

Choose format based on use case:

```json
{
  "format": "png"  // For UI with transparency or text
}
```

- **PNG**: Best for UI screenshots, preserves transparency
- **JPEG**: Smaller file size, good for photos/images

### 4. Viewport Optimization

Match viewport to your target:

```json
{
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

- Desktop: 1920x1080, 1366x768
- Tablet: 768x1024, 1024x1366
- Mobile: 375x667, 390x844

### 5. Element Selection

Use specific selectors to avoid ambiguity:

```json
{
  "selector": "#unique-id",  // Most specific
  "selector_type": "css"
}
```

## Error Handling

Common errors and solutions:

### Navigation Timeout

```
Error: Navigation timeout of 30000ms exceeded
```

**Solution**: Increase timeout or use faster wait condition:

```json
{
  "timeout": 60000,
  "wait_until": "domcontentloaded"
}
```

### Element Not Found

```
Error: Element not found or not visible: .selector
```

**Solution**: Ensure element exists and is visible:

```json
{
  "selector": ".existing-element",
  "wait_for_selector": true,
  "timeout": 45000
}
```

### Invalid URL

```
Error: Invalid URL format
```

**Solution**: Ensure URL is complete with protocol:

```json
{
  "url": "https://example.com"  // Include https://
}
```

## Performance Considerations

### File Sizes

Typical screenshot file sizes:

- **Full Page PNG**: 500KB - 5MB (depends on page length)
- **Viewport PNG**: 100KB - 500KB
- **Element PNG**: 10KB - 200KB
- **JPEG**: 30-70% smaller than PNG

### Processing Time

Approximate processing times:

- **Full Page**: 3-10 seconds (includes scrolling)
- **Viewport**: 1-3 seconds
- **Element**: 1-3 seconds

### Optimization Tips

1. Use JPEG for non-UI screenshots to reduce file size
2. Use viewport screenshots instead of full page when possible
3. Set specific timeouts to avoid unnecessary waiting
4. Use element screenshots for focused captures

## Integration Examples

### Bug Reporting Workflow

```javascript
// Capture error state
const screenshot = await playwright_screenshot_element({
  url: errorPageUrl,
  selector: ".error-container",
  selector_type: "css",
  format: "png"
});

// Attach to bug report
await createBugReport({
  title: "Login Error",
  screenshot: screenshot,
  description: "Error occurs when..."
});
```

### Automated Testing

```javascript
// Capture before and after states
const before = await playwright_screenshot_viewport({
  url: testUrl,
  viewport: { width: 1920, height: 1080 }
});

// Perform action...

const after = await playwright_screenshot_viewport({
  url: testUrl,
  viewport: { width: 1920, height: 1080 }
});

// Compare screenshots
await compareScreenshots(before, after);
```

### Documentation Generation

```javascript
// Capture all pages for documentation
const pages = [
  "/home",
  "/features",
  "/pricing",
  "/contact"
];

for (const page of pages) {
  await playwright_screenshot_fullpage({
    url: `https://example.com${page}`,
    format: "png",
    wait_until: "networkidle"
  });
}
```

## Security & Privacy

### URL Validation

All URLs are validated and sanitized:
- Must include protocol (http:// or https://)
- Invalid URLs are rejected
- Local file URLs are blocked

### Resource Cleanup

Browser instances are automatically cleaned up:
- Browsers close after each screenshot
- No persistent browser state
- Memory is released

### Data Privacy

Screenshot data handling:
- Screenshots can be saved locally
- Optional R2 upload (if configured)
- No data retention beyond tool execution

## Troubleshooting

### Common Issues

1. **Page doesn't load**
   - Check URL is valid and accessible
   - Increase timeout
   - Check network connectivity

2. **Element not captured**
   - Verify selector is correct
   - Ensure element is visible
   - Use `wait_for_selector: true`

3. **Screenshot is blank**
   - Wait for page to fully load
   - Use `wait_until: "networkidle"`
   - Check if page requires JavaScript

4. **Large file sizes**
   - Use JPEG instead of PNG
   - Use viewport or element screenshots
   - Reduce viewport dimensions

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/screenshots)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Human MCP Documentation](../README.md)
