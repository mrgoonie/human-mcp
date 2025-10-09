---
description: Implement payment integration with Polar.sh
---

Think harder to plan & start implementing payment integration with [Polar.sh](https://polar.sh/docs/llms-full.txt) follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules: 
<tasks>$ARGUMENTS</tasks>

## Workflow:

### Fullfill the request

* If you don't have any questions, skip this step and go to `Planning` step.
* If you have any questions, ask the user to clarify them.
* Ask 1 question at a time, wait for the user to answer before moving to the next question.
* Repeat this process until you have all the information you need to proceed.

### Planning

1. Use `planner` subagent to read the Polar.sh docs and create a implementation plan with TODO tasks in `./plans` directory.
2. Ask user to review and approve the plan, if the user requests to change the plan, repeat the previous step until the user approves the plan.

### Implementation

1. When user approves the plan, use **general agent (main agent)** to implement the plan step by step.
2. Run type checking and compile the code to make sure there are no syntax errors.

### Testing & Code Review

5. Write the tests for the plan, make sure you don't use fake data just to pass the tests, tests should be real and cover all possible cases.
6. Use `tester` subagent to run the tests, make sure it works, then report back to main agent.
7. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues, then ask main agent to fix all of them and 
8. Repeat the process until all tests pass or no more issues are reported. Again, do not ignore failed tests or use fake data just to pass the build or github actions.
9.  When all tests pass, delegate to `code-reviewer` subagent to review code. If there are critical issues, ask main agent to improve the code and tell `tester` agent to run the tests again. Repeat the process until all tests pass.
10. When all code is reviewed, the tasks are completed, report back to user with a summary of the changes and explain everything briefly, ask user to review the changes and approve them.

### Documentation

11. If user approves the changes, use `docs-manager` subagent to update the docs if needed.

### Final Report

12. Report back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.
