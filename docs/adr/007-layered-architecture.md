# ADR-007: Layered Architecture for Data Processing

**Date:** 2026-04-22
**Status:** Accepted
**Related:** ADR-005 (Nix/NixOS CI/CD)
**Deciders:** Development Team

---

## Context

Our application consumes live GTFS Realtime data (vehicle positions, trip updates, service alerts) from the Waltti open data API. Without a clear separation of concerns, the codebase risks becoming hard to maintain, test, and extend — especially as data handling logic, business rules, and UI concerns get mixed together.

The assignment also explicitly recommends a layered architecture with separated ingestion, processing, and application concerns.

---

## Decision

We organized the backend into four clearly separated layers, all located under `server/src/`:

### Layer 1 — Data Ingestion
**Status:** Accepted
**Location:** `server/src/ingestion/`
**Responsibility:** Fetch raw GTFS Realtime protobuf data from external feeds. Nothing else.
**Rules:**
- Only allowed to make HTTP requests and return raw feed data.
- No parsing, no business logic.
- Handles retries and timeouts.

### Layer 2 — Processing
**Status:** Accepted
**Location:** `server/src/processing/`
**Responsibility:** Parse raw protobuf data into clean domain objects. Apply business rules (staleness detection, data validation, delay calculation).
**Rules:**
- No HTTP calls.
- No direct UI concerns.
- Outputs strongly typed domain objects defined in `server/src/types/`.

### Layer 3 — Application / API
**Status:** Accepted
**Location:** `server/src/app.ts`, `server/src/index.ts`
**Responsibility:** Expose processed data to the frontend via REST endpoints. Handle request/response formatting.
**Rules:**
- No direct GTFS parsing.
- No raw HTTP calls to external feeds.
- Calls processing layer only.

### Cache Layer
**Status:** Accepted
**Location:** `server/src/cache/`
**Responsibility:** Store the last successful fetch result. Serve cached data when the feed is temporarily unreachable.

---

## Consequences

**Positive:**
- Each layer can be tested in isolation (unit tests for processing, integration tests for ingestion).
- Easy to swap data sources or add new feeds without touching UI code.
- Clear ownership: team members can work on different layers without conflicts.
- Meets assignment requirement for separated concerns.
- Compatible with Nix build system (ADR-005).

**Negative:**
- Slightly more files and boilerplate upfront.
- Shared domain types managed separately in `server/src/types/`.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Single file fetching + parsing + serving | Hard to test, violates separation of concerns. |
| Microservices per feed | Overkill for a course project team of 4. |
| No backend, frontend calls GTFS directly | CORS restrictions, security, no server-side caching possible. |
