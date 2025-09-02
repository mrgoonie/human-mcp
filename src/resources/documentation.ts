export const documentationContent = `# Human MCP API Documentation

## Overview

Human MCP brings human-like visual capabilities to AI coding agents, enabling them to understand and debug visual content like screenshots, recordings, and UI elements.

## Available Tools

### eyes.analyze

Comprehensive visual analysis tool for images, videos, and GIFs.

**Parameters:**
- \`source\` (string, required): URL, file path, or base64 encoded content
- \`type\` (enum, required): "image" | "video" | "gif"  
- \`analysis_type\` (enum, optional): "general" | "ui_debug" | "error_detection" | "accessibility" | "performance" | "layout"
- \`detail_level\` (enum, optional): "basic" | "detailed" | "extreme"
- \`specific_focus\` (string, optional): Areas to focus analysis on
- \`extract_text\` (boolean, optional): Extract text from image (default: true)
- \`detect_ui_elements\` (boolean, optional): Detect UI elements (default: true)
- \`analyze_colors\` (boolean, optional): Analyze color scheme (default: false)
- \`check_accessibility\` (boolean, optional): Check accessibility (default: false)

**Example:**
\`\`\`json
{
  "source": "/path/to/screenshot.png",
  "type": "image",
  "analysis_type": "ui_debug",
  "detail_level": "detailed",
  "specific_focus": "login form validation errors"
}
\`\`\`

### eyes.compare

Compare two images to identify visual differences.

**Parameters:**
- \`source1\` (string, required): First image to compare
- \`source2\` (string, required): Second image to compare  
- \`comparison_type\` (enum, optional): "pixel" | "structural" | "semantic"

**Example:**
\`\`\`json
{
  "source1": "/path/to/before.png",
  "source2": "/path/to/after.png", 
  "comparison_type": "structural"
}
\`\`\`

## Analysis Types

### ui_debug
Focus on layout issues, rendering problems, misalignments, and visual bugs.

### error_detection  
Look for visible error messages, error states, and system failures.

### accessibility
Analyze color contrast, readability, and WCAG compliance issues.

### performance
Identify performance indicators, loading states, and optimization opportunities.

### layout
Examine responsive design, positioning, and visual hierarchy.

## Detail Levels

### basic
Concise analysis focusing on most important findings.

### detailed  
Thorough analysis with specific details about each finding.

### extreme
Exhaustive analysis with pixel-level precision and comprehensive technical details.

## Common Use Cases

### Debugging UI Issues
\`\`\`json
{
  "source": "screenshot.png",
  "type": "image", 
  "analysis_type": "ui_debug",
  "detail_level": "detailed"
}
\`\`\`

### Analyzing Error States
\`\`\`json
{
  "source": "error-recording.mp4",
  "type": "video",
  "analysis_type": "error_detection", 
  "specific_focus": "form submission errors"
}
\`\`\`

### Accessibility Audits
\`\`\`json
{
  "source": "page.png",
  "type": "image",
  "analysis_type": "accessibility",
  "check_accessibility": true
}
\`\`\`

### Performance Analysis
\`\`\`json
{
  "source": "loading-screen.gif",
  "type": "gif",
  "analysis_type": "performance"
}
\`\`\`

## Response Format

All tools return structured analysis including:

- **analysis**: Detailed text analysis
- **detected_elements**: Array of UI elements with locations
- **debugging_insights**: Technical insights for developers  
- **recommendations**: Actionable suggestions
- **metadata**: Processing information and timing

## Best Practices

1. Use appropriate analysis types for your specific needs
2. Provide context in \`specific_focus\` for better results
3. Use "detailed" level for most debugging tasks
4. Compare images when analyzing changes or regressions
5. Include error descriptions when analyzing failures

## Error Handling

The server provides detailed error messages for:
- Invalid image formats
- Network failures when fetching URLs
- API key issues with Gemini
- Processing timeouts
- Unsupported file types

For support and issues: https://github.com/human-mcp/human-mcp/issues
`;

export const examplesContent = `# Human MCP Debugging Examples

## Example 1: Debugging a Broken Login Form

**Scenario**: Users report login button not working

**Analysis Request**:
\`\`\`json
{
  "source": "/screenshots/broken-login.png",
  "type": "image",
  "analysis_type": "ui_debug", 
  "detail_level": "detailed",
  "specific_focus": "login button and form validation"
}
\`\`\`

**Key Findings**:
- Login button appears disabled (grayed out)
- Email field shows red border indicating validation error
- No error message visible to user
- Password field missing required indicator

**Recommendations**:
- Add clear error messages for validation failures
- Ensure button state reflects form validity
- Improve visual feedback for required fields

## Example 2: Performance Issue Investigation

**Scenario**: Page feels slow and unresponsive

**Analysis Request**:
\`\`\`json
{
  "source": "/recordings/slow-loading.mp4",
  "type": "video",
  "analysis_type": "performance",
  "detail_level": "detailed"
}
\`\`\`

**Key Findings**:
- 3-second blank screen before content appears
- Images loading progressively causing layout shifts
- Spinner shows for extended periods
- No loading state for dynamic content

**Recommendations**:
- Implement skeleton loading states
- Optimize image loading strategy
- Add progressive enhancement
- Consider lazy loading for below-fold content

## Example 3: Accessibility Audit

**Scenario**: Ensuring WCAG compliance

**Analysis Request**:
\`\`\`json
{
  "source": "/screenshots/dashboard.png", 
  "type": "image",
  "analysis_type": "accessibility",
  "check_accessibility": true,
  "detail_level": "detailed"
}
\`\`\`

**Key Findings**:
- Color contrast ratio below 4.5:1 for secondary text
- No visible focus indicators on interactive elements
- Important actions only indicated by color
- Text size appears below 16px on mobile

**Recommendations**:
- Increase contrast for all text elements
- Add visible focus outlines
- Use icons or text alongside color coding
- Ensure minimum text size for readability

## Example 4: Cross-Browser Layout Issues

**Scenario**: Layout appears different across browsers

**Comparison Request**:
\`\`\`json
{
  "source1": "/screenshots/chrome-layout.png",
  "source2": "/screenshots/firefox-layout.png",
  "comparison_type": "structural"
}
\`\`\`

**Key Differences**:
- Firefox shows additional spacing in navigation
- Button heights vary between browsers  
- Font rendering differs affecting line heights
- CSS Grid behavior inconsistent

**Recommendations**:
- Add CSS reset/normalize stylesheet
- Use explicit sizing for interactive elements
- Test with consistent font loading strategies
- Implement browser-specific CSS if needed

## Example 5: Error State Analysis

**Scenario**: Application crashes under certain conditions

**Analysis Request**:
\`\`\`json
{
  "source": "/recordings/crash-reproduction.mp4",
  "type": "video", 
  "analysis_type": "error_detection",
  "detail_level": "extreme",
  "specific_focus": "sequence leading to white screen"
}
\`\`\`

**Key Findings**:
- Error occurs after clicking "Submit" on complex form
- Brief loading state followed by blank page
- No user feedback about what went wrong
- Previous data appears lost

**Recommendations**:
- Implement proper error boundaries
- Add comprehensive form validation
- Preserve user data during errors
- Show helpful error messages instead of blank screens

## Integration Patterns

### With Testing Frameworks
\`\`\`typescript
// Example: Automated visual regression testing
async function visualRegressionTest(testName: string) {
  const screenshot = await takeScreenshot();
  
  const analysis = await humanMcp.analyze({
    source: screenshot,
    type: "image",
    analysis_type: "ui_debug",
    detail_level: "detailed"
  });
  
  if (analysis.debugging_insights.length > 0) {
    throw new Error(\`Visual issues found: \${analysis.debugging_insights.join(', ')}\`);
  }
}
\`\`\`

### With CI/CD Pipelines
\`\`\`yaml
# Example: GitHub Actions integration
- name: Visual Quality Check
  run: |
    npm run screenshot
    human-mcp analyze screenshot.png --type=image --analysis=ui_debug
\`\`\`

These examples demonstrate the practical application of Human MCP for common debugging scenarios in web development.
`;