export const debuggingPrompts = [
  {
    name: "debug_ui_screenshot",
    title: "Debug UI Screenshot",
    description: "Analyze a UI screenshot to identify layout issues, misalignments, or rendering problems",
    arguments: [
      {
        name: "screenshot",
        description: "The screenshot to analyze",
        required: true
      },
      {
        name: "expected_behavior", 
        description: "Description of expected UI behavior",
        required: false
      }
    ],
    template: `Analyze this UI screenshot for debugging:
Screenshot: {{screenshot}}
Expected behavior: {{expected_behavior}}

Please identify:
1. Any visible errors or anomalies
2. Layout or alignment issues
3. Missing or broken elements
4. Accessibility concerns
5. Performance indicators

Use the eyes.analyze tool with analysis_type="ui_debug" to get detailed insights.`
  },
  {
    name: "analyze_error_recording",
    title: "Analyze Error Recording", 
    description: "Analyze a screen recording to understand when and how an error occurs",
    arguments: [
      {
        name: "recording",
        description: "Video recording of the error",
        required: true
      },
      {
        name: "error_description",
        description: "Description of the error",
        required: true
      }
    ],
    template: `Analyze this screen recording to debug an error:
Recording: {{recording}}
Error description: {{error_description}}

Focus on:
1. The sequence of events leading to the error
2. Visual cues indicating the problem
3. UI state changes
4. Potential root causes
5. Reproduction steps

Use the eyes.analyze tool with analysis_type="error_detection" and type="video" for comprehensive analysis.`
  },
  {
    name: "accessibility_audit", 
    title: "Accessibility Audit",
    description: "Perform a visual accessibility audit of a UI screenshot",
    arguments: [
      {
        name: "screenshot",
        description: "Screenshot of the UI to audit",
        required: true
      },
      {
        name: "focus_areas",
        description: "Specific accessibility areas to focus on",
        required: false
      }
    ],
    template: `Perform an accessibility audit of this UI:
Screenshot: {{screenshot}}
Focus areas: {{focus_areas}}

Analyze for:
1. Color contrast ratios
2. Text readability
3. Focus indicators
4. Alternative text presence
5. WCAG compliance issues
6. Keyboard navigation support

Use the eyes.analyze tool with analysis_type="accessibility" and check_accessibility=true.`
  },
  {
    name: "performance_visual_audit",
    title: "Performance Visual Audit",
    description: "Analyze a screenshot for visual performance indicators",
    arguments: [
      {
        name: "screenshot",
        description: "Screenshot showing performance metrics or loading states",
        required: true
      }
    ],
    template: `Analyze this screenshot for performance issues:
Screenshot: {{screenshot}}

Look for:
1. Loading indicators and their appropriateness
2. Layout shift evidence
3. Render blocking signs
4. Large unoptimized images
5. Performance metric readings
6. Visual indicators of slow responses

Use the eyes.analyze tool with analysis_type="performance".`
  },
  {
    name: "layout_comparison",
    title: "Layout Comparison",
    description: "Compare two UI layouts to identify differences",
    arguments: [
      {
        name: "layout1",
        description: "First layout screenshot",
        required: true
      },
      {
        name: "layout2", 
        description: "Second layout screenshot",
        required: true
      },
      {
        name: "comparison_context",
        description: "Context for the comparison (e.g., before/after, desktop/mobile)",
        required: false
      }
    ],
    template: `Compare these two layouts:
Layout 1: {{layout1}}
Layout 2: {{layout2}}
Context: {{comparison_context}}

Identify:
1. Structural differences
2. Element positioning changes
3. Spacing and alignment variations
4. Responsive design issues
5. Visual hierarchy changes

Use the eyes.compare tool with comparison_type="structural".`
  }
];