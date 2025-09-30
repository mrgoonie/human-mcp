---
description: Use subagents to plan and fix hard issues
---

Think hard to plan & start fixing these issues follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules: 
<issues>$ARGUMENTS</issues>

## Workflow:
1. Use `planner` subagent and `researcher` subagent to create a implementation plan with TODO tasks in `./plans` directory.
2. Then use general agent (main agent) to implement the plan step by step.
3. Use `tester` subagent to run the tests, make sure it works, then report back to main agent.
4. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues, then ask main agent to fix all of them and 
5. Repeat the process until all tests pass or no more issues are reported.
6. After finishing, delegate to `code-reviewer` subagent to review code. If there are critical issues, ask main agent to improve the code and test everything again.
7. Report back to user with a summary of the changes and explain everything briefly.
