---
description: Run test suite and fix issues
---

## Reported Issues:
<issue>
 $ARGUMENTS
</issue>

## Workflow:
1. First use `tester` subagent to run the tests.
2. Then use `debugger` subagent to find the root cause of the issues.
3. Then use `planner` subagent to create a implementation plan with TODO tasks in `./plans` directory.
4. Then implement the plan.
5. After finishing, delegate to `code-reviewer` agent to review code.
6. Repeat this process until all tests pass and no more errors are reported.