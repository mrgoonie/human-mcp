---
description: Analyze the current copy issues and enhance it
---

Enhance the copy based on reported issues:
<issues>$ARGUMENTS</issues>

## Workflow

- If the user provides a screenshots or videos, use `eyes_analyze` tool from Human MCP to describe as detailed as possible the issue, make sure copywriter can fully understand the issue easily based on the description.
- You can use `screenshot` tools from "human" mcp server to capture screenshots and analyze the current issues with `eyes_analyze` tool.
- Use multiple `scouter` agents to scout the current codebase or given codebase (if any) to understand the context, then report back to `copywriter` agent.
- Use `copywriter` agent to write the enhanced copy into the code files, then report back to main agent.