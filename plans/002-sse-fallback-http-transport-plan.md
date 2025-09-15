# Implementation Plan: SSE Fallback for HTTP Transport

## Executive Summary
- Problem Statement
  - We must support legacy MCP clients that only implement the deprecated HTTP+SSE transport while keeping the current Streamable HTTP transport as the default. Current server only supports Streamable HTTP (plus SSE notifications on the same /mcp route), so older clients cannot connect.
- Proposed Solution (KISS)
  - Add an optional, isolated SSE transport fallback with two endpoints (/sse for GET event stream, /messages for POST messages) alongside the existing Streamable HTTP routes. Keep transports segregated per session to prevent mixing.
- Resource Requirements
  - 1 backend TS engineer, 0.5 QA engineer, 0.25 DevOps for deploy hooks
- Timeline (realistic)
  - 1.5–2 weeks including tests, documentation, and hardening

## Architecture Overview
- System Components (minimal viable set)
  - Existing Streamable HTTP transport (unchanged)
  - New SSE fallback endpoints backed by SDK’s SSEServerTransport
  - Lightweight in-memory registry for SSE sessions (separate from Streamable HTTP sessions)
  - Security middleware reuse (CORS, DNS-rebinding, secret auth)
- Data Flow (simplified)
  - Legacy client: GET /sse opens SSE stream -> server sends notifications over SSE -> client POSTs JSON-RPC messages to /messages with sessionId -> server routes through SSEServerTransport
  - Modern client: Uses existing /mcp Streamable HTTP POST/GET/DELETE endpoints
- Integration Points (essential only)
  - SDK: @modelcontextprotocol/sdk/server/sse.js (SSEServerTransport)
  - Existing Express app and middleware

## Implementation Phases

### Phase 1: Design and Config Wiring (Day 1–2)
- Add config flags (default off to obey YAGNI):
  - HttpTransportConfig.enableSseFallback?: boolean (default false)
  - HttpTransportConfig.ssePaths?: { stream: string; message: string } (defaults: stream='/sse', message='/messages')
  - Reuse existing security and CORS config
- Non-goals: No persistent session store for SSE initially (YAGNI). In-memory only, like Streamable HTTP by default.

### Phase 2: SSE Routes and Session Handling (Day 3–6)
- Add router when enableSseFallback=true
  - GET {ssePaths.stream}
    - Create new SSEServerTransport; connect to McpServer
    - Store in sseTransports map keyed by transport.sessionId
    - On res close, delete entry and close transport
    - Return 405 if sessionMode === 'stateless'
  - POST {ssePaths.message}?sessionId=...
    - Look up sseTransports[sessionId]
    - If found: transport.handlePostMessage(req, res, req.body)
    - Else: 400 no transport for sessionId
- Transport segregation rules (must-have)
  - Do not share sessions across transports
  - Do not allow mixing: Streamable HTTP sessionId cannot be used on SSE endpoints and vice versa
- Observability
  - Add concise logs for session create/close, message counts, and error paths

### Phase 3: Security, CORS, and Browser Compatibility (Day 7)
- CORS
  - Ensure Mcp-Session-Id is exposed (already done) and allowed headers include mcp-session-id
- DNS-rebinding
  - Reuse middleware; align allowedHosts with Streamable HTTP
- Authentication (optional)
  - Reuse secret-based Bearer token if configured

### Phase 4: Tests and Compatibility (Day 8–10)
- Unit tests
  - SSE registry add/remove
  - Route guards for stateless mode and missing sessionId
- Integration tests
  - Happy path: GET /sse -> POST /messages -> tool call success
  - Bad path: POST /messages with unknown sessionId -> 400
  - Mix defense: Using Streamable HTTP sessionId on SSE -> 400; SSE sessionId on /mcp -> 400
  - CORS headers present where applicable
- Backwards-compat verification
  - Run SDK example client streamableHttpWithSseFallbackClient to confirm legacy connectivity

### Phase 5: Documentation and Rollout (Day 11–12)
- Update docs/system-architecture-blueprint.md with transport compatibility and routing diagram
- Update README and docs/codebase-summary.md references where strictly needed
- Add configuration examples to .env.example
- Ship behind feature flag (enableSseFallback=false by default)

## Detailed Design

### Config surface (TypeScript, illustrative)
- HttpTransportConfig additions:
  - enableSseFallback?: boolean
  - ssePaths?: { stream: string; message: string }
- Defaults:
  - enableSseFallback: false
  - ssePaths: { stream: '/sse', message: '/messages' }

### Express wiring
- In src/transports/http/server.ts
  - After existing /mcp router registration, check config.enableSseFallback and mount SSE router
- SSE Router (new):
  - Keeps local Map<string, SSEServerTransport> sseTransports
  - GET stream path: instantiate SSEServerTransport(streamPath, res) or new SSEServerTransport(baseUrl?) per SDK, connect server, onclose cleanup
  - POST message path: route body to transport.handlePostMessage
- Stateless mode guard
  - Both SSE endpoints respond 405 in stateless mode with MCP-compliant JSON-RPC error structure

### Session and mixing policy
- Keep streamable transports in SessionManager (existing Map)
- Keep SSE transports in a separate in-router map
- Reject requests that attempt to cross-use session IDs across transports
  - Simple check: If sessionId format matches a known SSE session, deny Streamable HTTP use; and vice versa

### Error handling
- Reuse existing handleError for JSON errors (POST)
- For GET SSE stream, ensure try/catch logs and res end on exception; avoid double writes

### Health and readiness
- /health remains as-is; optionally include sseFallback: enabled/disabled flag for diagnostics

## Risk Assessment & Mitigation
- High-Risk Items
  - Transport mixing bugs leading to undefined state
    - Mitigation: Clear separations and explicit guards; unit tests
  - Resource leaks on SSE disconnection
    - Mitigation: res.on('close') -> transport.close(); map cleanup; add timeouts
  - Browser CORS issues
    - Mitigation: Tests validating exposed headers and preflight handling
- Probable Failure Points
  - Missing sessionId on POST /messages
  - Misconfigured allowedHosts blocking legitimate access
  - Legacy client behavior variance
- Mitigation Strategies
  - Strict validation and explicit 4xx errors
  - Feature flag default off; progressive rollout
  - Add structured logs to quickly triage

## Success Criteria
- Measurable Outcomes
  - Legacy SDK SSE client connects and completes a tool call end-to-end
  - No memory leaks after 1k connect/disconnect cycles in test harness
  - Mix attempts are rejected with clear 400s
- Performance Benchmarks
  - SSE connection setup < 50ms local; message roundtrip comparable to current HTTP
- Quality Gates
  - All unit/integration tests pass; CORS/headers verified; security middleware applied

## Out-of-Scope (YAGNI)
- External/persistent session stores for SSE (revisit if horizontal scaling demand appears)
- OAuth on SSE endpoints (keep secret-based bearer only if configured)
- Metrics backend beyond logs

## Implementation Checklist
- Config additions and defaults
- SSE router with GET stream and POST message endpoints
- Segregated SSE session map with lifecycle cleanup
- Guards for stateless mode and mix prevention
- Tests: unit + integration
- Docs updated: blueprint + README + .env.example
- Rollout: enabled via flag per environment

## Realistic Timeline
- Week 1
  - Config + routes + session handling + basic tests
- Week 2
  - Hardening, security validations, compatibility tests, docs, release prep

## References (SDK docs/examples)
- Typescript SDK SSE server example and compatibility patterns
- Client with SSE fallback example
- CORS header requirements for MCP
