---
description: Run test suite and fix issues
---

## Reported Issues:
<issue>
 $ARGUMENTS
</issue>

## Workflow:
1. First use `tester` subagent to compile the code and fix all syntax errors if any.
2. Then use `tester` subagent to run the tests.
3. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues.
4. Then use `planner` subagent to create a implementation plan with TODO tasks in `./plans` directory.
5. Then implement the plan step by step.
6. Use `tester` subagent to run the tests after implementing the plan, make sure it works, then report back to main agent.
7. After finishing, delegate to `code-reviewer` agent to review code. If there are critical issues, ask main agent to improve the code and test everything again.
8. Repeat this process until all tests pass and no more errors are reported.