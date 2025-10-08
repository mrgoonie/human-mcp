---
description: Create a design based on video
---

Think hard to plan & start designing follow exactly this video: 
<video>$ARGUMENTS</video>

## Workflow:
1. Use `eyes` analyze tool to describe super details of the video: be specific about describing every element, every interaction, every animation, every transition, every color, every font, every border, every spacing, every size, every shape, every texture, every material, every light, every shadow, every reflection, every refraction, every blur, every glow, every image, background transparency, etc.
   - **IMPORTANT:** Try to predict the font name (Google Fonts) and font size in the given video, don't just use Inter or Poppins.
2. Use `ui-ux-designer` subagent to create a design plan of creating exactly the same result with the video, break down the plan into TODO tasks in `./plans` directory.
3. Then implement the plan step by step.
4. If user doesn't specify, create the design in pure HTML/CSS/JS.
5. Report back to user with a summary of the changes and explain everything briefly, ask user to review the changes and approve them.
6. If user approves the changes, update the `./docs/design-guideline.md` docs if needed.

## Important Notes:
- **ALWAYS REMEBER that you have the skills of a top-tier UI/UX Designer who won a lot of awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Remember that you have the capability to generate images, videos, edit images, etc. with Human MCP Server tools. Use them to create the design with real assets.
- Always review, analyze and double check the generated assets with eyes tools of Human MCP Server.
- Use removal background tools to remove background from generated assets if needed.
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.
- Maintain and update `./docs/design-guideline.md` docs if needed.