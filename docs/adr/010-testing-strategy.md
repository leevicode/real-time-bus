# ADR-010: Testing Strategy

**Date:** 2026-05-05
**Status:** Accepted

---

## Context

As the application grows in complexity — with multiple processing layers, API endpoints, and real-time data handling — we need a consistent testing strategy to catch regressions and verify correctness. We need to decide what to test, how to run tests, and how to integrate them into our CI/CD pipeline.

---

## Decision

We will write automated tests for the backend (server) covering two layers:

### What We Test

| Layer | Type | Scope |
|---|---|---|
| Processing layer | Unit tests | `busProcessor`, `routeProcessor`, `shapeProcessor`, `stopProcessor` |
| API layer | Integration tests | REST endpoints in `api/routes.ts`, `api/shapes.ts`, `api/stops.ts` |

The frontend (React) is not covered by automated tests in this phase.

### Testing Toolchain

- **Framework:** Vitest
- **Runtime:** `npm run test` inside the `server/` directory
- **Environment:** Nix shell via `nix develop` to ensure reproducible test environment
- **CI Integration:** Tests run automatically on every pull request via GitHub Actions

### CI Pipeline Command

```yaml
- name: Run unit tests
  run: nix develop --command bash -c "cd server && npm run test"
```

This requires `cachix/install-nix-action@v31` to be set up before running tests.

---

## Rationale

**Why Vitest?**
- Native TypeScript support — no extra configuration needed
- Compatible with the existing Vite-based frontend toolchain (ADR-003)
- Fast execution with watch mode for development

**Why test Processing and API layers?**
- Processing layer has pure functions with no HTTP calls — easy to unit test in isolation
- API layer has the most user-facing risk — integration tests verify endpoints return correct data

**Why run tests inside Nix?**
- Consistent with ADR-005 (Nix for CI/CD)
- Guarantees same environment locally and in CI
- Prevents "works on my machine" failures

**Why not test the frontend?**
- Frontend is UI-heavy and changes frequently
- Core logic and data correctness is better verified at the backend level
- Can be added in a future iteration

---

## Consequences

**Positive:**
- Regressions in processing or API logic are caught automatically on every PR.
- Tests run in the same Nix environment as production builds.
- Vitest integrates naturally with the TypeScript stack.

**Negative:**
- Frontend bugs are not caught by automated tests.
- Nix setup required before running tests locally (see ADR-005).

---

## References

- ADR-003: Use React (Vite toolchain)
- ADR-005: Nix/NixOS for CI/CD pipeline
- `server/` — backend source code
- `.github/workflows/ci.yml` — CI pipeline configuration

