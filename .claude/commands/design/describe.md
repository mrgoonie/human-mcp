---
description: Describe a design based on screenshot/video
---

Think hard to describe the design based on this screenshot/video: 
<screenshot>$ARGUMENTS</screenshot>

## Workflow:
1. Use `eyes` analyze tool to describe super details of the screenshot/video so the developer can implement it easily.
   - Be specific about design style, every element, elements' positions, every interaction, every animation, every transition, every color, every border, every icon, every font style, font size, font weight, every spacing, every padding, every margin, every size, every shape, every texture, every material, every light, every shadow, every reflection, every refraction, every blur, every glow, every image, background transparency, etc.
   - **IMPORTANT:** Try to predict the font name (Google Fonts) and font size in the given screenshot, don't just use Inter or Poppins.
2. Use `ui-ux-designer` subagent to create a design implementation plan of creating exactly the same result with the screenshot/video, break down the plan into TODO tasks in `./plans` directory.
3. Report back to user with a summary of the plan.