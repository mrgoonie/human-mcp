---
description: Analyze Github Actions logs and fix issues
---
## Github Actions URL
<url>$ARGUMENTS</url>

## Workflow
- Use the `planer-researcher` to read the github actions logs, analyze and find the root causes of the issues, then provide a detailed plan for implementing the fixes.
- Use proper developer agents to implement the plan.
- Use `tester` agent to run the tests, make sure it works, then report back to main agent.
- If there are issues or failed tests, ask main agent to fix all of them and repeat the process until all tests pass.
