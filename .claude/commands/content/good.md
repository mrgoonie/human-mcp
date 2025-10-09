---
description: Write good creative & smart copy [GOOD]
---

Write good creative & smart copy for this user request:
<user_request>$ARGUMENTS</user_request>

## Workflow

- If the user provides a screenshots or videos, use `eyes_analyze` tool from Human MCP to describe as detailed as possible the issue, make sure copywriter can fully understand the issue easily based on the description.
- Use multiple `researcher` agents in parallel to search for relevant information & multiple `scouter` agents to scout the current codebase or given codebase (if any) to understand the project, then report back to `planner` agent.
- Use `planner` agent to plan the copy, make sure it can satisfy the user request.
- Use `copywriter` agent to write the copy based on the plan, then report back to main agent.