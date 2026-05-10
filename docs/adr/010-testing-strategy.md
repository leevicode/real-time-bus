# ADR-010: Testing Strategy

**Date:** 2026-05-05
**Status:** Accepted
**Authors:** Leevi, Valtteri, viirret, Negar

---

## Context

As the application grows in complexity with multiple processing layers, API endpoints, and real-time data handling we need a consistent testing strategy to catch regressions and verify correctness. We need to decide what to test, how to run tests, and how to integrate them into our CI/CD pipeline.

---

## Decision

We will write automated tests for the backend (server) covering four layers:

### What We Test

| Layer | Type | Scope |
|---|---|---|
| Processing layer | Unit tests | `busProcessor`, `routeProcessor`, `shapeProcessor`, `stopProcessor` |
| Ingestion layer (RT) | Unit tests | `gtfsRtIngestion.ts` — realtime feed fetching |
| Ingestion layer (Static) | Unit tests | `staticGtfsIngestion.ts` — static GTFS data loading |
| API layer | Integration tests | REST endpoints in `api/routes.ts`, `api/shapes.ts`, `api/stops.ts` |
| Cache layer | Unit tests | Cache read/write and staleness behavior |

The frontend (React) is not covered by automated tests in this phase.

### Testing Toolchain

- **Framework:** Vitest
- **Runtime:** `npm run test` inside the `server/` directory in nix shell

---

## Rationale

**Why Vitest?**
- Native TypeScript support — no extra configuration needed
- Compatible with the existing Vite-based frontend toolchain (ADR-003)
- Fast execution with watch mode for development
- Industry standard for TypeScript/Vite projects

**Why test Processing and API layers?**
- Processing layer has pure functions with no HTTP calls — easy to unit test in isolation
- API layer has the most user-facing risk — integration tests verify endpoints return correct data

**Why run tests in CI in nix shell?**
- Consistent with ADR-005 (Nix for CI/CD)
- Guarantees same environment in CI
- Prevents "works on my machine" failures

**Why not test the frontend?**
- The frontend consists primarily of UI components whose correctness is best verified through visual inspection and manual testing rather than automated assertions
- Behavior and appearance of interactive map elements, markers, and overlays are difficult to assert meaningfully in unit tests
- Core logic and data correctness is better verified at the backend level
- Can be added in a future iteration

---

## Consequences

**Positive:**
- Regressions in processing, ingestion, cache, or API logic are caught automatically on every PR.
- Tests run in the same Nix environment as production builds in CI.
- Vitest integrates naturally with the TypeScript stack.

**Negative:**
- Frontend bugs are not caught by automated tests.
- Nix setup required for running tests in CI (see ADR-005).

---

## References

- ADR-003: Use React (Vite toolchain)
- ADR-005: Nix/NixOS for CI/CD pipeline
- `server/` — backend source code
- `.github/workflows/ci.yml` — CI pipeline configuration
