# Security and Performance Execution Spec

## Goal

Raise the application to a stronger production baseline in two tracks:

1. End-to-end security hardening for all users
2. End-to-end performance resilience as usage and data volume grow

This document converts the roadmap into an implementation sequence with concrete deliverables, acceptance criteria, and file-level ownership.

## Guiding Principles

- Prefer defense in depth over single-layer protections.
- Move expensive work off hot read paths whenever possible.
- Add observability before major optimization so we can measure impact.
- Ship low-risk, high-impact hardening first.
- Use phased delivery so we can verify each layer before the next one lands.

## Phase 0: Baseline and Measurement

### Deliverables

- Add structured logging helpers for request-scoped events and errors
- Add timing around high-value auth, API, and mutation paths
- Define initial performance targets
- Document security and deployment guardrails

### Files

- `src/lib/observability.ts`
- `src/app/actions.ts`
- `src/app/api/auth/[...path]/route.ts`
- `src/app/api/trips/[tripId]/route/route.ts`
- `README.md`

### Acceptance Criteria

- We can track request or action names, durations, and high-level outcomes in logs
- Core flows have measurable latency baselines
- Security and deployment expectations are documented in-repo

## Phase 1: Immediate Hardening

### Deliverables

- Add HTTP security headers and cache directives
- Gate or remove production debug surfaces
- Add best-effort rate limiting to auth, route generation, and core mutations
- Remove direct HTML rendering of user-supplied map popup content
- Add timeouts and structured logging around third-party route fetches

### Files

- `next.config.ts`
- `src/app/auth-debug/page.tsx`
- `src/app/providers.tsx`
- `src/app/api/auth/[...path]/route.ts`
- `src/app/api/trips/[tripId]/route/route.ts`
- `src/components/trips/trip-map.tsx`
- `src/app/actions.ts`
- `src/lib/rate-limit.ts`

### Acceptance Criteria

- Security headers are returned for app and API routes
- Production users cannot access debug auth tooling
- Repeated abusive requests receive `429`
- Map popup rendering no longer interprets user-controlled HTML
- Route fetch failures degrade cleanly and log enough context to debug

## Phase 2: Data-Layer Defense in Depth

### Deliverables

- Add database-backed audit logging for high-risk actions
- Add Postgres row-level security plan and migration path
- Tighten cross-field validation and business invariants
- Normalize security-sensitive identifiers such as emails and URLs consistently

### Files

- `src/db/schema.ts`
- `db/migrations/*`
- `src/app/actions.ts`
- `src/lib/permissions.ts`

### Acceptance Criteria

- High-risk changes are auditable
- Database policies can enforce membership constraints independent of app code
- Invalid state transitions are blocked consistently

## Phase 3: Rendering and Caching

### Deliverables

- Remove broad `force-dynamic` usage where not required
- Introduce more intentional invalidation and caching boundaries
- Split large trip page data loads by section or interaction

### Files

- `src/app/(app)/layout.tsx`
- `src/app/(app)/trips/page.tsx`
- `src/app/(app)/trips/[tripId]/page.tsx`
- `src/app/(app)/trips/[tripId]/members/page.tsx`
- `src/lib/data.ts`
- `src/app/actions.ts`

### Acceptance Criteria

- Repeat navigations improve TTFB
- Mutations invalidate only affected views
- Large trips do not require full-page data reloads for every section

## Phase 4: Route and Map Hot Path Optimization

### Deliverables

- Persist or cache route geometry instead of recomputing on read
- Recompute route artifacts only after relevant writes
- Reduce client rerender pressure and map payload overhead

### Files

- `src/app/api/trips/[tripId]/route/route.ts`
- `src/components/trips/trip-map.tsx`
- `src/db/schema.ts`
- `db/migrations/*`
- `src/app/actions.ts`

### Acceptance Criteria

- Route API typically serves cached or precomputed data
- Trip detail latency does not grow linearly with route complexity
- Map remains responsive with many points and segments

## Phase 5: Database and Reliability Scaling

### Deliverables

- Review real query plans and add indexes where justified
- Add external dependency resilience patterns
- Document backup, restore, and recovery targets

### Files

- `src/lib/data.ts`
- `src/lib/permissions.ts`
- `src/app/api/trips/[tripId]/route/route.ts`
- `README.md`
- `db/migrations/*`

### Acceptance Criteria

- Core queries stay within target latency under expected load
- Third-party API instability does not break primary user flows
- Recovery steps are documented and testable

## Phase 6: Verification and Readiness

### Deliverables

- Add CI security checks
- Add load and performance validation scripts
- Complete a production readiness review

### Files

- `package.json`
- CI configuration files when introduced
- `README.md`
- `scripts/*` if added

### Acceptance Criteria

- Build pipeline enforces baseline quality and security checks
- We know the supported traffic and data-size envelope
- Rollout readiness is documented with observable success criteria

## Current Execution Order

1. Phase 1 hardening and baseline instrumentation
2. Phase 2 data-layer controls
3. Phase 3 rendering and cache refinement
4. Phase 4 route precomputation and map optimization
5. Phase 5 database tuning and reliability
6. Phase 6 verification and readiness

## Work Started

The first implementation pass will land:

- execution spec documentation
- security headers
- production gating for auth debug tooling
- structured observability helpers
- best-effort in-memory rate limiting for critical paths
- safer popup rendering in the map
- route API timeout and logging improvements

## Known Follow-Ups

- Replace in-memory rate limiting with a shared durable store
- Introduce audit tables and request correlation storage
- Add row-level security without breaking current application access patterns
- Replace broad path invalidation with targeted cache tags
- Persist route geometry and route invalidation metadata
