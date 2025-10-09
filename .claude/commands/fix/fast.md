---
description: Analyze and fix the issue [FAST]
---

Analyze and fix this issue:
<issue>$ARGUMENTS</issue>

## Workflow

- If the user provides a screenshots or videos, use `eyes_analyze` tool from Human MCP to describe as detailed as possible the issue, make sure developers can predict the root causes easily based on the description.
- Use `tester` agent to test the fix and make sure it works, then report back to main agent.
- If there are issues or failed tests, ask main agent to fix all of them and repeat the process until all tests pass.