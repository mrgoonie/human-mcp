---
description: Scout given directories to respond to the user's requests
argument-hint: [user-prompt] [scale]
---

## Purpose

Search the codebase for files needed to complete the task using a fast, token efficient agent.

## User's requests & target directories
<user_requests>$ARGUMENTS</user_requests>

## Variables

USER_PROMPT: $1
SCALE: $2 (defaults to 3)
RELEVANT_FILE_OUTPUT_DIR: `plans/scouts/`

## Workflow:
- Write a prompt for 'SCALE' number of agents to the Task tool that will immediately call the Bash tool to run these commands to kick off your agents to conduct the search:
  - `gemini -p "[prompt]" --model gemini-2.5-flash-preview-09-2025`
  - `opencode run "[prompt]" --model opencode/grok-code` (if count > 3)

**How to prompt the agents:**
- IMPORTANT: Kick these agents off in parallel using the Task tool, analyze and divide folders for each agent to scout intelligently and quickly.
- IMPORTANT: These agents are calling OTHER agentic coding tools to search the codebase. DO NOT call any search tools yourself.
- IMPORTANT: That means with the Task tool, you'll immediately call the Bash tool to run the respective agentic coding tool (gemini, opencode, claude, etc.)
- IMPORTANT: Instruct the agents to quickly search the codebase for files needed to complete the task. This isn't about a full blown search, just a quick search to find the files needed to complete the task.
- Instruct the subagent to use a timeout of 3 minutes for each agent's bash call. Skip any agents that don't return within the timeout, don't restart them.