# Design Report
## Jyväskylä Realtime Public Transport App

**Course:** Continuous Software Engineering
**University:** University of Jyväskylä
**Date:** May 2026
**Team:** Viirret, Timonen, Leino, Daneshvar
**Repository:** https://github.com/leevicode/real-time-bus

---

## 1. Introduction

### 1.1 Problem Statement

Public transport users in Jyväskylä often face uncertainty when waiting for buses. Static timetables do not reflect real-world delays or route changes. Without live information, passengers cannot make informed decisions about when to leave or which stop to use.

### 1.2 Solution

We designed and built a web application that displays live bus positions for Jyväskylä using GTFS Realtime data from the Waltti open data platform. The application enables users to see where buses currently are on a map in real time.

### 1.3 Use Case Focus

The application focuses on **vehicle tracking on a route**, allowing users to see live positions of all buses on a selected route (UC-01).

---

## 2. System Architecture

### 2.1 Overview

The system follows a layered architecture with a clear separation between data ingestion, processing, and presentation. It consists of two main components: a server (Node.js + Express + TypeScript) and a client (React + TypeScript + Vite), communicating via REST API and WebSocket.

```
Client (React + Vite)
        ↕ REST API + WebSocket
Server (Node.js + Express)
    ├── Layer 3: API          (api/)
    ├── Cache Layer           (cache/)
    ├── Layer 2: Processing   (processing/)
    └── Layer 1: Ingestion    (ingestion/)
        ↕ HTTPS
Waltti Open Data API (GTFS Realtime + Static)
```

### 2.2 Backend Layers

**Layer 1 — Data Ingestion** (`server/src/ingestion/`)

This layer fetches data from GTFS. It contains two modules: `gtfsRtIngestion.ts` fetches live vehicle positions, while `staticGtfsIngestion.ts` loads route and stop data once at startup. This layer performs no parsing or business logic.

**Layer 2 — Processing** (`server/src/processing/`)

This layer processes raw GTFS data into clean TypeScript types and interfaces. It contains four processors: `busProcessor.ts`, `routeProcessor.ts`, `shapeProcessor.ts`, and `stopProcessor.ts`. Domain types are defined in `server/src/types/`.

**Cache Layer** (`server/src/cache/`)

Stores the last successful fetch result from each feed. When a feed is temporarily unavailable, the cache serves the last known data instead of returning an error.

**Layer 3 — Application / API** (`server/src/api/`)

Exposes processed data to the frontend via REST endpoints (`routes.ts`, `shapes.ts`, `stops.ts`) and a WebSocket connection (`websocket.ts`) for pushing live vehicle positions to the client in real time.

### 2.3 Frontend

The frontend (`app/`) is built with React, TypeScript, and Vite. It renders live vehicle positions on an interactive map and communicates with the backend via REST for static data and WebSocket for live vehicle positions.

### 2.4 Technology Stack

| Component | Technology | Decision |
|---|---|---|
| Frontend | React + TypeScript + Vite | ADR-003 |
| Backend | Node.js + Express + TypeScript | ADR-004 |
| CI/CD | Github Actions + Nix flake | ADR-005 |
| Hosting | Azure Web App | ADR-006 |
| Version Control | GitHub | ADR-002 |
| Testing | Vitest | ADR-010 |

---

## 3. Key Design Decisions

### 3.1 Layered Architecture (ADR-007)

The backend was organized into clearly separated layers to improve maintainability and testability. Each layer has a single responsibility: ingestion fetches raw data, processing transforms it into TypeScript types, and the API layer serves it. This separation allows each layer to be tested independently.

### 3.2 GTFS Feed Selection (ADR-008)

We consume two feeds from the Waltti open data platform: Vehicle Positions (every 2 seconds) and GTFS Static data (loaded once at startup).

### 3.3 WebSocket for Live Updates

Rather than relying solely on REST polling, the application uses WebSocket to push vehicle position updates to the frontend. This reduces latency and unnecessary HTTP overhead, providing a smoother real-time experience for the user.

---

## 4. Handling Uncertainty

A key challenge in this application is that GTFS Realtime data can be unreliable. Feeds can be temporarily unavailable. We addressed this through the cache layer: when a feed is unreachable, the cache serves the last known data instead of returning an error, ensuring the application remains functional.

---

## 5. Testing Strategy (ADR-010)

Automated tests cover all backend layers using **Vitest**, an industry-standard testing framework with native TypeScript support:

| Layer | Type | Scope |
|---|---|---|
| Processing | Unit tests | `busProcessor`, `routeProcessor`, `shapeProcessor`, `stopProcessor` |
| Ingestion (RT) | Unit tests | `gtfsRtIngestion.ts` |
| Ingestion (Static) | Unit tests | `staticGtfsIngestion.ts` |
| Cache | Unit tests | Cache read/write behavior |
| API | Integration tests | REST endpoints in `routes.ts`, `shapes.ts`, `stops.ts` |

The frontend is not covered by automated unit tests. The frontend consists primarily of interactive visual components: map rendering, vehicle markers, and overlays whose correctness is best verified through visual inspection and manual testing rather than automated unit tests. Core logic and data correctness is verified at the backend level instead.

Tests run automatically on every pull request via GitHub Actions in a Nix shell, ensuring consistent and reproducible results.

---

## 6. Challenges and Lessons Learned

**GTFS Protobuf Parsing:** Parsing binary protobuf data from the Waltti API required careful handling of optional fields and nested structures. The processing layer was designed to handle missing fields gracefully rather than throwing errors.

**WebSocket + REST Coordination:** Combining WebSocket for live positions with REST for static data required careful state management on the frontend to avoid stale or conflicting data.

**Nix Learning Curve:** Adopting Nix for the CI/CD pipeline (ADR-005) introduced an initial learning curve when creating a CI/CD pipeline with it. However, it eliminated environment inconsistency issues entirely and made CI runs fully reproducible.

---

## 7. Conclusion

The Jyväskylä Realtime Public Transport App successfully delivers on its core use case of vehicle tracking on a route. The layered architecture provides a clean, maintainable codebase. Automated testing and a reproducible CI/CD pipeline support confident ongoing development.

Future improvements could include data quality rules (staleness detection, GPS bounds filtering), service alerts, frontend automated testing, and mobile-optimized UI.

---

## References

- Waltti Open Data Platform: https://opendata.waltti.fi
- GTFS Realtime Specification: https://gtfs.org/realtime
- Architecture Decision Records: `docs/adr/`
- Use Cases: `docs/use-case/`
