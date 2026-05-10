# Design Report
## Jyväskylä Realtime Public Transport App

**Course:** Continuous Software Engineering  
**University:** University of Jyväskylä  
**Date:** May 2026  
**Team:** Leevi, Valtteri, viirret, Negar  
**Repository:** https://github.com/leevicode/real-time-bus

---

## 1. Introduction

### 1.1 Problem Statement

Public transport users in Jyväskylä often face uncertainty when waiting for buses. Static timetables do not reflect real-world delays, vehicle breakdowns, or route changes. Without live information, passengers cannot make informed decisions about when to leave, which stop to use, or whether an alternative route is needed.

### 1.2 Solution

We designed and built a web application that displays live bus positions and route information for Jyväskylä using GTFS Realtime data from the Waltti open data platform. The application enables users to track vehicles on a route in real time, view upcoming departures at stops, and receive service alerts about disruptions.

### 1.3 Use Case Focus

The application focuses on **vehicle tracking on a route**, allowing users to:
- See live positions of all buses on a selected route (UC-01)
- Track a single vehicle in detail with delay information (UC-02)
- View service alerts for a route (UC-03)
- Search for routes by name or stop (UC-04)

---

## 2. System Architecture

### 2.1 Overview

The system follows a layered architecture with a clear separation between data ingestion, processing, and presentation. It consists of two main components: a backend server (Node.js + Express + TypeScript) and a frontend client (React + TypeScript + Vite), communicating via REST API and WebSocket.

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

This layer is responsible for fetching raw GTFS data from the Waltti API. It contains two modules: `gtfsRtIngestion.ts` polls Vehicle Positions, Trip Updates, and Service Alerts at different intervals, while `staticGtfsIngestion.ts` loads route and stop data once at startup. This layer performs no parsing or business logic.

**Layer 2 — Processing** (`server/src/processing/`)

This layer parses raw GTFS protobuf data into clean TypeScript domain objects and applies data quality rules. It contains four processors: `busProcessor.ts`, `routeProcessor.ts`, `shapeProcessor.ts`, and `stopProcessor.ts`. Data quality rules include flagging stale data (>120 seconds old), filtering out-of-bounds GPS coordinates, defaulting null delay values to 0, and skipping implausible speed readings (>100 km/h).

**Cache Layer** (`server/src/cache/`)

Stores the last successful fetch result from each feed. When a feed is temporarily unavailable, the cache serves the last known data with a staleness warning rather than returning an error, ensuring graceful degradation.

**Layer 3 — Application / API** (`server/src/api/`)

Exposes processed data to the frontend via REST endpoints (`routes.ts`, `shapes.ts`, `stops.ts`) and a WebSocket connection (`websocket.ts`) for pushing live vehicle positions to the client in real time.

### 2.3 Frontend

The frontend (`app/`) is built with React, TypeScript, and Vite. It renders live vehicle positions on an interactive map, highlights selected buses, displays service alerts as banners, and supports route search. It communicates with the backend via REST for static data (routes, stops, shapes) and WebSocket for live vehicle positions.

### 2.4 Technology Stack

| Component | Technology | Decision |
|---|---|---|
| Frontend | React + TypeScript + Vite | ADR-003 |
| Backend | Node.js + Express + TypeScript | ADR-004 |
| CI/CD | Nix flakes + GitHub Actions | ADR-005 |
| Hosting | Azure Web App | ADR-006 |
| Version Control | GitHub | ADR-002 |
| Testing | Vitest | ADR-010 |

---

## 3. Key Design Decisions

### 3.1 Layered Architecture (ADR-007)

The backend was organized into clearly separated layers to improve maintainability and testability. Each layer has a single responsibility: ingestion fetches raw data, processing validates and transforms it, and the API layer serves it. This separation allows each layer to be tested independently and makes it easy to swap data sources without affecting the rest of the system.

### 3.2 GTFS Feed Selection (ADR-008)

We consume four feeds from the Waltti open data platform: Vehicle Positions (every 10 seconds), Trip Updates (every 15 seconds), Service Alerts (every 60 seconds), and GTFS Static data (loaded once at startup). Different refresh rates were chosen to balance data freshness with server load.

### 3.3 WebSocket for Live Updates

Rather than relying solely on REST polling, the application uses WebSocket to push vehicle position updates to the frontend. This reduces latency and unnecessary HTTP overhead, providing a smoother real-time experience for the user.

---

## 4. Handling Uncertainty

A key challenge in this application is that GTFS Realtime data is inherently unreliable. Feeds can be delayed, incomplete, or inconsistent. We addressed this through a dedicated data quality strategy in the processing layer:

**Stale Data:** If a GPS timestamp is older than 120 seconds, the system adds an `is_stale: true` flag. The frontend displays a "Last updated X seconds ago" warning rather than showing misleading fresh-looking data.

**Missing Data:** If a feed is temporarily unreachable, the cache layer serves the last known data instead of returning an error. Vehicle markers remain visible on the map with a staleness indicator.

**Inconsistent Data:** If vehicle position data exists but no matching trip update is found, the system shows the position only and hides delay information with a note. This is preferable to showing incorrect delay data.

**Invalid Data:** GPS coordinates outside Jyväskylä bounds and speed readings above 100 km/h are filtered out at the processing layer before reaching the API or frontend.

**Null Fields:** Fields such as `delay` that may be null in the feed are defaulted to 0 in the processing layer to prevent application crashes.

This approach ensures the application always presents a meaningful state to the user, even under poor data conditions.

---

## 5. Testing Strategy (ADR-010)

Automated tests cover all backend layers using **Vitest**, an industry-standard testing framework with native TypeScript support:

| Layer | Type | Scope |
|---|---|---|
| Processing | Unit tests | `busProcessor`, `routeProcessor`, `shapeProcessor`, `stopProcessor` |
| Ingestion (RT) | Unit tests | `gtfsRtIngestion.ts` — realtime feed fetching |
| Ingestion (Static) | Unit tests | `staticGtfsIngestion.ts` — static GTFS data loading |
| Cache | Unit tests | Cache read/write and staleness behavior |
| API | Integration tests | REST endpoints in `routes.ts`, `shapes.ts`, `stops.ts` |

The frontend is not covered by automated tests in this phase. The frontend consists primarily of interactive visual components — map rendering, vehicle markers, and overlays — whose correctness is best verified through visual inspection and manual testing rather than automated assertions. Core logic and data correctness is verified at the backend level instead.

Tests run automatically on every pull request via GitHub Actions in a Nix shell, ensuring consistent and reproducible results across all machines.

---

## 6. Challenges and Lessons Learned

**GTFS Protobuf Parsing:** Parsing binary protobuf data from the Waltti API required careful handling of optional fields and nested structures. The processing layer was designed to handle missing fields gracefully rather than throwing errors.

**WebSocket + REST Coordination:** Combining WebSocket for live positions with REST for static data required careful state management on the frontend to avoid stale or conflicting data.

**Nix Learning Curve:** Adopting Nix for the CI/CD pipeline (ADR-005) introduced an initial learning curve for the team. However, it eliminated environment inconsistency issues entirely and made CI runs fully reproducible.

**Data Freshness vs. Performance:** Finding the right refresh interval for each feed required balancing user experience (fresher data) against server load and API rate limits. Different intervals were chosen per feed based on how frequently that data realistically changes.

---

## 7. Conclusion

The Jyväskylä Realtime Public Transport App successfully delivers on its core use case of vehicle tracking on a route. The layered architecture provides a clean, maintainable codebase. The data quality strategy ensures the application degrades gracefully under poor network or feed conditions. Automated testing and a reproducible CI/CD pipeline support confident ongoing development.

Future improvements could include frontend automated testing, support for additional cities beyond Jyväskylä, and mobile-optimized UI.

---

## References

- Waltti Open Data Platform: https://opendata.waltti.fi
- GTFS Realtime Specification: https://gtfs.org/realtime
- Architecture Decision Records: `docs/adr/`
- Use Cases: `docs/use-case/`
