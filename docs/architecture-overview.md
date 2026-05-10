# Architecture Overview — Jyväskylä Realtime Public Transport App

## System Summary

A web application that displays live bus positions and route information for Jyväskylä using GTFS Realtime data from the Waltti open data platform. The system is split into two main parts: a **backend server** (Node.js + Express + TypeScript) and a **frontend client** (React + TypeScript + Vite).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Data Source | GTFS Realtime + GTFS Static (Waltti API) |
| CI/CD | Nix flakes (ADR-005) |
| Hosting | Azure Web App (ADR-006) |
| Version Control | GitHub (ADR-002) |
| Testing | Vitest (ADR-010) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (app/)                  │
│           React + TypeScript + Vite              │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Map UI  │  │  Alerts  │  │  Route Search │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────┬──────────────────┬───────────────┘
               │ HTTP REST        │ WebSocket
               │ (routes,shapes,  │ (live positions)
               │  stops)          │
┌──────────────▼──────────────────▼───────────────┐
│                  SERVER (server/)                 │
│            Node.js + Express + TypeScript         │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │         Layer 3 — Application / API (api/)   │ │
│  │  routes.ts, shapes.ts, stops.ts,             │ │
│  │  websocket.ts                                │ │
│  └───────────────────┬─────────────────────────┘ │
│                      │                           │
│  ┌───────────────────▼─────────────────────────┐ │
│  │            Cache Layer (cache/)              │ │
│  │      Stores last successful fetch result     │ │
│  └───────────────────┬─────────────────────────┘ │
│                      │                           │
│  ┌───────────────────▼─────────────────────────┐ │
│  │         Layer 2 — Processing (processing/)   │ │
│  │  busProcessor, routeProcessor,               │ │
│  │  shapeProcessor, stopProcessor               │ │
│  │  Validates, cleans, and flags stale data     │ │
│  └───────────────────┬─────────────────────────┘ │
│                      │                           │
│  ┌───────────────────▼─────────────────────────┐ │
│  │         Layer 1 — Ingestion (ingestion/)     │ │
│  │  gtfsRtIngestion.ts + staticGtfsIngestion.ts │ │
│  └───────────────────┬─────────────────────────┘ │
└────────────────────────────────────────────────  │
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│           Waltti Open Data API                   │
│  • Vehicle Positions (every 10s)                 │
│  • Trip Updates      (every 15s)                 │
│  • Service Alerts    (every 60s)                 │
│  • GTFS Static       (on startup)                │
└─────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### Layer 1 — Data Ingestion (`server/src/ingestion/`)
**Status:** Accepted

Responsible for fetching raw GTFS data from the Waltti API. Contains two files:
- `gtfsRtIngestion.ts` — polls Vehicle Positions, Trip Updates, and Service Alerts feeds at different intervals
- `staticGtfsIngestion.ts` — loads route and stop data once at startup

This layer has no business logic — it only fetches and returns raw data.

---

### Layer 2 — Processing (`server/src/processing/`)
**Status:** Accepted

Parses raw GTFS protobuf data into clean TypeScript domain objects. Contains four processors:
- `busProcessor.ts` — processes live vehicle positions
- `routeProcessor.ts` — processes route information
- `shapeProcessor.ts` — processes route shape/path geometry
- `stopProcessor.ts` — processes bus stops and next departures (PR #24)

Also applies data quality rules:
- Flags data older than 120 seconds as `is_stale: true`
- Filters out GPS coordinates outside Jyväskylä bounds
- Defaults null delay values to 0 to prevent crashes
- Skips data points with speed > 100 km/h

Domain types are defined in `server/src/types/`.

---

### Cache Layer (`server/src/cache/`)
**Status:** Accepted

Stores the last successful fetch from each feed. If a feed becomes temporarily unavailable, the cache serves the last known data with a staleness warning instead of returning an error.

---

### Layer 3 — Application / API (`server/src/api/`)
**Status:** Accepted

Exposes processed data to the frontend via REST endpoints and WebSocket. Contains:
- `routes.ts` — REST endpoints for route information
- `shapes.ts` — REST endpoints for route geometry
- `stops.ts` — REST endpoints for bus stops and next departures
- `websocket.ts` — WebSocket connection for pushing live vehicle positions to the frontend in real time

Helper utilities shared across layers are in `server/src/lib/gtfs.ts`.

---

### Frontend (`app/`)
**Status:** Accepted

React + TypeScript application built with Vite. Displays live vehicle positions on a map, shows service alerts as banners, and supports route search. Communicates with the backend via REST API calls.

---

## Data Flow Example (UC-01: View Live Vehicles)

```
1. User selects Route 4 in the UI
2. Frontend calls GET /api/vehicles/route/4
3. Layer 3 receives request → calls Processing layer
4. Processing layer checks Cache → returns last known data
5. In background: Ingestion fetches fresh data every 10s
6. Processing validates → updates Cache
7. Frontend receives vehicle positions → renders on map
8. If data is stale → UI shows "Last updated X seconds ago"
```

---

## Key Design Decisions

| Decision | ADR |
|---|---|
| Use ADR documentation | ADR-001 |
| GitHub for version control | ADR-002 |
| React for frontend | ADR-003 |
| Node.js + Express for backend | ADR-004 |
| Nix for CI/CD | ADR-005 |
| Azure for hosting | ADR-006 |
| Layered architecture | ADR-007 |
| GTFS feed selection | ADR-008 |
| TypeScript across stack | ADR-009 |
| Testing strategy | ADR-010 |

---

## Testing Coverage

Automated tests cover all backend layers using **Vitest**:

| Layer | Type |
|---|---|
| Processing | Unit tests |
| Ingestion (RT + Static) | Unit tests |
| Cache | Unit tests |
| API | Integration tests |

Tests run automatically on every pull request via GitHub Actions in a Nix shell (ADR-005).
