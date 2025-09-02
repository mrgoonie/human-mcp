/**
 * Example: Complete debugging session with Human MCP
 * 
 * This demonstrates a typical workflow for debugging UI issues
 * using the Human MCP server's visual analysis capabilities.
 */

import { createServer } from "../src/server.js";

async function debuggingSession() {
  console.log("🔍 Starting Human MCP debugging session...\n");
  
  const server = await createServer();
  
  // Example 1: Analyze a UI screenshot for layout issues
  console.log("1️⃣ Analyzing UI screenshot for layout issues...");
  
  const uiAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/broken-ui.png",
    type: "image",
    analysis_type: "ui_debug",
    detail_level: "detailed",
    specific_focus: "navigation menu alignment and button states"
  });
  
  console.log("📊 UI Analysis Results:");
  console.log(uiAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 2: Investigate error in screen recording
  console.log("2️⃣ Investigating error sequence in recording...");
  
  const errorAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/error-recording.mp4", 
    type: "video",
    analysis_type: "error_detection",
    detail_level: "detailed",
    specific_focus: "form submission failure and user feedback"
  });
  
  console.log("🚨 Error Analysis Results:");
  console.log(errorAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 3: Compare before/after layouts
  console.log("3️⃣ Comparing layouts before and after changes...");
  
  const comparison = await server.callTool("eyes.compare", {
    source1: "/path/to/before-fix.png",
    source2: "/path/to/after-fix.png",
    comparison_type: "structural"
  });
  
  console.log("📈 Layout Comparison Results:");
  console.log(comparison.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 4: Accessibility audit
  console.log("4️⃣ Performing accessibility audit...");
  
  const a11yAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/page-screenshot.png",
    type: "image", 
    analysis_type: "accessibility",
    detail_level: "detailed",
    check_accessibility: true,
    specific_focus: "color contrast and focus indicators"
  });
  
  console.log("♿ Accessibility Analysis Results:");
  console.log(a11yAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 5: Performance analysis of loading animation
  console.log("5️⃣ Analyzing loading animation performance...");
  
  const perfAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/loading-animation.gif",
    type: "gif",
    analysis_type: "performance", 
    detail_level: "detailed",
    specific_focus: "loading indicators and user feedback timing"
  });
  
  console.log("⚡ Performance Analysis Results:");
  console.log(perfAnalysis.content[0].text);
  
  console.log("\n✅ Debugging session complete!");
}

// Run the example if called directly
if (import.meta.main) {
  debuggingSession().catch(console.error);
}

export { debuggingSession };