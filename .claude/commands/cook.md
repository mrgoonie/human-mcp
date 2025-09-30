---
description: Implement a feature
---

Think hard to plan & start working on these tasks follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules: 
<tasks>$ARGUMENTS</tasks>

## Workflow:
1. Use `planner` subagent and `researcher` subagent to create a implementation plan with TODO tasks in `./plans` directory.
2. Then use general agent (main agent) to implement the plan step by step.
3. Run type checking and compile the code to make sure there are no syntax errors.
4. Write the tests for the plan, make sure you don't use fake data just to pass the tests, tests should be real and cover all possible cases.
5. Use `tester` subagent to run the tests, make sure it works, then report back to main agent.
6. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues, then ask main agent to fix all of them and 
7. Repeat the process until all tests pass or no more issues are reported. Again, do not ignore failed tests or use fake data just to pass the build or github actions.
8. After finishing, delegate to `code-reviewer` subagent to review code. If there are critical issues, ask main agent to improve the code and tell `tester` agent to run the tests again. Repeat the process until all tests pass.
9. When all tests pass, code is reviewed, the tasks are completed, report back to user with a summary of the changes and explain everything briefly, ask user to review the changes and approve them.
10. If user approves the changes, use `docs-manager` subagent to update the docs if needed.
11. Finally use `git-manager` subagent to commit and push to git repository.
