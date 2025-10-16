# Development Rules

## General
- **File Size Management**: Keep individual code files under 500 lines for optimal context management
  - Split large files into smaller, focused components
  - Use composition over inheritance for complex widgets
  - Extract utility functions into separate modules
  - Create dedicated service classes for business logic
- You ALWAYS follow these principles: **YANGI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)**
- Use `context7` mcp tools for exploring latest docs of plugins/packages
- Use `gh` bash command to interact with Github features.
- Use `psql` bash command to query database for debugging.
- Use `eyes` mcp tools for describing details of images, videos, documents, etc.
- Use `hands` mcp tools for generating images, videos, documents, etc.
- Use `brain` mcp tools for sequential thinking, analyzing code, debugging, etc.
- **[IMPORTANT]** Follow the codebase structure and code standards in `./docs` during implementation
- **[IMPORTANT]** When you finish the implementation, send a full summary report to Discord channel with `./.claude/send-discord.sh 'Your message here'` script (remember to escape the string).
- **[IMPORTANT]** Do not just simulate the implementation or mocking them, always implement the real code.

## Subagents
Delegate detailed tasks to these subagents according to their roles & expertises:
- Use file system (in markdown format) to hand over reports in `./plans/reports` directory from agent to agent with this file name format: `YYMMDD-from-agent-name-to-agent-name-task-name-report.md`.
- Use `planner` agent to plan for the implementation plan using templates in `./plans/templates/` (`planner` agent can spawn multiple `researcher` agents in parallel to explore different approaches with "Query Fan-Out" technique).
- Use `database-admin` agent to run tests and analyze the summary report.
- Use `tester` agent to run tests and analyze the summary report.
- Use `debugger` agent to collect logs in server or github actions to analyze the summary report.
- Use `code-reviewer` agent to review code according to the implementation plan.
- Use `docs-manager` agent to update docs in `./docs` directory if any (espcially for `./docs/codebase-summary.md` when significant changes are made).
- Use `git-manager` agent to commit and push code changes.
- Use `project-manager` agent for project's progress tracking, completion verification & TODO status management.
- **[IMPORTANT]** Always delegate to `project-manager` agent after completing significant features, major milestones, or when requested to update project documentation.
- **IMPORTANT:** You can intelligently spawn multiple subagents **in parallel** or **chain them sequentially** to handle the tasks efficiently.

## Code Quality Guidelines
- Read and follow codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but make sure there are no syntax errors and code are compilable
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation

## Pre-commit/Push Rules
- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build or github actions)
- Keep commits focused on the actual code changes
- **DO NOT** commit and push any confidential information (such as dotenv files, API keys, database credentials, etc.) to git repository!
- NEVER automatically add AI attribution signatures like:
  "🤖 Generated with [Claude Code]"
  "Co-Authored-By: Claude noreply@anthropic.com"
  Any AI tool attribution or signature
- Create clean, professional commit messages without AI references. Use conventional commit format.

## Code Implementation

- Before you start, delegate to `planner` agent to create a implementation plan with TODO tasks in `./plans` directory.
- When in planning phase, use multiple `researcher` agents in parallel to conduct research on different relevant technical topics and report back to `planner` agent to create implementation plan.
- Write clean, readable, and maintainable code
- Follow established architectural patterns
- Implement features according to specifications
- Handle edge cases and error scenarios
- **DO NOT** create new enhanced files, update to the existing files directly.
- **[IMPORTANT]** After creating or modifying code file, run compile command/script to check for any compile errors.