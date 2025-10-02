---
description: Analyze the codebase and update documentation
---

Use `docs/` directory as the source of truth for documentation.
Use `docs-manager` agent to analyze the codebase and update documentation:
- `README.md`: Update README
- `docs/project-overview-pdr.md`: Update project overview and PDR (Product Development Requirements)
- `docs/codebase-summary.md`: Update codebase summary
- `docs/codebase-structure-architecture-code-standards.md`: Update codebase structure, architecture, and code standards
- Only update `CLAUDE.md` or `AGENTS.md` when requested.

## Additional requests
<additional_requests>
  $ARGUMENTS
</additional_requests>

**IMPORTANT**: **Do not** start implementing.