# Implementation Plan: OpenCode STDIO Compatibility + R2 Skip in STDIO

## Executive Summary
- Problem Statement
  - OpenCode fails to launch Human MCP via `npx @goonnguyen/human-mcp` in STDIO mode. Root cause is packaging/CLI entrypoint: package.json lacks a proper Node-executable "bin" and shebang wrapper, so `npx` has nothing to execute. Separately, when running in STDIO, the server should avoid any Cloudflare R2 uploads and rely on inline base64 for Gemini, but one code path still tries optional R2 upload for large base64 images.
- Proposed Solution (KISS)
  - Add a small Node ESM CLI wrapper with a `#!/usr/bin/env node` shebang and map it via the `bin` field in package.json so `npx @goonnguyen/human-mcp` runs reliably in any MCP client (including OpenCode). Gate all Cloudflare R2 upload behavior strictly to HTTP transport only; in STDIO, always pass inline base64 to Gemini.
- Resource Requirements
  - 1 engineer, ~0.5–1 day. No infrastructure changes.
- Timeline (realistic)
  - Packaging fix + gating change + tests + docs update: 1 business day. Release as v1.3.1.

## Architecture Overview
- System Components (minimal viable set)
  - CLI Entrypoint: lightweight Node ESM wrapper that imports `dist/index.js`.
  - Transport Manager: unchanged. STDIO remains the default in config.
  - Eyes tools: Image/video processors; add a small conditional to skip R2 in STDIO paths.
- Data Flow (simplified)
  - OpenCode spawns `npx @goonnguyen/human-mcp` → Node executes CLI wrapper → starts STDIO transport → tools run → images/videos are converted locally to base64 and sent to Gemini.
- Integration Points (essential only)
  - Gemini Vision API via inlineData base64 only in STDIO; Cloudflare R2 used only in HTTP transport.

## Implementation Phases
### Phase 1: Packaging (STDIO CLI via npx)
1) Add CLI wrapper
   - Create `bin/human-mcp.js` with:
     - Shebang: `#!/usr/bin/env node`
     - Single line: `import('../dist/index.js');`
     - Because the package is `"type": "module"`, `.js` is ESM and the import executes the built server which already calls `main()`.
2) Update package.json
   - Add `"bin": { "human-mcp": "bin/human-mcp.js" }`.
   - Ensure `"build"` outputs Node-compatible ESM: already `bun build src/index.ts --target=node --outdir=dist`.
   - Optionally add `"files": ["dist", "bin", "README.md", "LICENSE"]` to guarantee wrapper and build artifacts are included in the published tarball.
   - Optionally add `"engines": { "node": ">=18" }` for clarity.
3) Sanity checks
   - Local: `bun run build` → `node bin/human-mcp.js` should start STDIO server.
   - npx smoke test: `npx .` from a packed tarball or `npm pack` output.

Immediate user workaround (if needed before release):
- Configure OpenCode to run your local repo directly:
  - command: `["bun", "run", "/absolute/path/to/human-mcp/src/index.ts"]` (works with MCP Inspector logs shown). When v1.3.1 is out, switch back to `npx @goonnguyen/human-mcp`.

### Phase 2: R2 Upload Gating in STDIO
1) Image processor (`src/tools/eyes/processors/image.ts`)
   - In the base64 branch, gate the optional R2 upload strictly to HTTP transport:
     - Replace current logic with: `if (process.env.TRANSPORT_TYPE === 'http' && cloudflare && data.length > 1MB) { ... }`.
   - Keep existing behavior for HTTP/Claude Desktop virtual paths; in STDIO they won’t trigger.
   - Maintain local file path logic: in STDIO, always process locally (already implemented).
2) No changes required for video processor beyond existing local frame extraction; videos are processed locally and frames are sent inline to Gemini.

### Phase 3: Tests
- Unit tests
  - New: `image-stdio-r2-skip.test.ts` to assert that when `TRANSPORT_TYPE=stdio`, the base64 path does not call `getCloudflareR2()` or attempt any upload even for >1MB input.
  - Existing tests around HTTP transport remain valid.
- Integration sanity
  - Spawn STDIO server and run a simple `eyes_analyze` on a local image path and a base64 image to confirm no external network calls to R2 and successful Gemini request construction.

### Phase 4: Docs and Examples
- README
  - Add OpenCode configuration example for STDIO:
    ```json
    {
      "$schema": "https://opencode.ai/config.json",
      "mcp": {
        "human": {
          "type": "local",
          "command": ["npx", "@goonnguyen/human-mcp"],
          "enabled": true,
          "environment": {
            "GOOGLE_GEMINI_API_KEY": "<your_key>",
            "TRANSPORT_TYPE": "stdio"
          }
        }
      }
    }
    ```
  - Document that in STDIO mode the server never attempts Cloudflare R2 uploads; all media is sent to Gemini using inline base64 (per Gemini docs).
  - Add a security note reminding users not to hardcode secrets in shared configs; prefer local environment variables.

## Risk Assessment & Mitigation
- High-Risk Items
  - npx execution may fail if bin wrapper is incorrect (ESM/CJS mismatch).
- Probable Failure Points
  - Using `require()` in a package with `"type": "module"` would break. Mitigate by using ESM `import('../dist/index.js');` in the wrapper.
  - Missing files in published package. Mitigate with `"files"` whitelist and CI verification `npm pack` before release.
- Mitigation Strategies
  - Test locally with Node 18/20.
  - Verify `npx @goonnguyen/human-mcp` in a clean temp dir.
  - Keep R2 gating minimal and transport-scoped (YAGNI/KISS) to avoid unintended behavior changes.

## Success Criteria
- Measurable Outcomes
  - `npx @goonnguyen/human-mcp` launches STDIO server successfully in OpenCode and MCP Inspector.
  - `eyes_analyze` works on local file paths and base64 sources in STDIO without any Cloudflare calls.
- Performance Benchmarks
  - No regression: image processing remains sub-second for typical images before Gemini roundtrip.
- Quality Gates
  - All unit/integration tests pass locally and in CI.
  - Manual STDIO verification via MCP Inspector succeeds.

## Brutal Honesty Checklist
- Unrealistic expectations identified? Yes: expecting `npx` to work without a `bin` is unrealistic.
- Over-engineering called out? Yes: no new feature flags; simple transport check is enough.
- Every "requirement" questioned? Yes: only R2 gating in STDIO is needed now; no broader refactor.
- Probable failure points identified? Yes: ESM bin wrapper and publish packaging.
- Timelines realistic? Yes: 1 day for code, tests, docs, and a patch release.

## YAGNI/KISS/DRY Application
- YAGNI: No new config flags; gate on existing `TRANSPORT_TYPE`.
- KISS: Tiny ESM bin wrapper; minimal conditional for R2 gating.
- DRY: Reuse existing transport config and Cloudflare helper; no duplicated pathways.
