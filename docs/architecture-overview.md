# Architecture Overview — Jyväskylä Realtime Public Transport App

## System Summary

A web application that displays live bus positions and route information for Jyväskylä using GTFS Realtime data from the Waltti open data platform. The system is split into two parts: a **server** (Node.js + Express + TypeScript) and a **client** (React + TypeScript + Vite).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Data Source | GTFS Realtime + GTFS Static (Waltti API) |
| CI/CD | Github Actions + Nix flake (ADR-005) |
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
│  ┌──────────┐  ┌──────────────────────────────┐  │
│  │  Map UI  │  │  WebSocket Client            │  │
│  └──────────┘  └──────────────────────────────┘  │
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
│  │  Processes data into TypeScript types        │ │
│  └───────────────────┬─────────────────────────┘ │
│                      │                           │
│  ┌───────────────────▼─────────────────────────┐ │
│  │   Layer 1 — Ingestion (ingestion/)           │ │
│  │  Fetches data from GTFS                      │ │
│  │  gtfsRtIngestion.ts + staticGtfsIngestion.ts │ │
│  └───────────────────┬─────────────────────────┘ │
└──────────────────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│           Waltti Open Data API                   │
│  • Vehicle Positions (every 2s)                  │
│  • GTFS Static       (on startup)                │
└─────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### Layer 1 — Data Ingestion (`server/src/ingestion/`)
**Status:** Accepted

Fetches data from GTFS. Contains two files:
- `gtfsRtIngestion.ts` — fetches live vehicle positions
- `staticGtfsIngestion.ts` — loads route and stop data once at startup

This layer has no business logic — it only fetches and returns raw data.

---

### Layer 2 — Processing (`server/src/processing/`)
**Status:** Accepted

Processes raw GTFS data into clean TypeScript types and interfaces. Contains four processors:
- `busProcessor.ts` — processes live vehicle positions
- `routeProcessor.ts` — processes route information
- `shapeProcessor.ts` — processes route shape/path geometry
- `stopProcessor.ts` — processes bus stops and next departures

Domain types are defined in `server/src/types/`.

---

### Cache Layer (`server/src/cache/`)
**Status:** Accepted

Stores the last successful fetch result from each feed. If a feed becomes temporarily unavailable, the cache serves the last known data instead of returning an error.

---

### Layer 3 — Application / API (`server/src/api/`)
**Status:** Accepted

Exposes processed data to the frontend via REST endpoints and WebSocket. Contains:
- `routes.ts` — REST endpoints for route information
- `shapes.ts` — REST endpoints for route geometry
- `stops.ts` — REST endpoints for bus stops and next departures
- `websocket.ts` — WebSocket connection for pushing live vehicle positions to the client in real time

Helper utilities shared across layers are in `server/src/lib/gtfs.ts`.

---

### Frontend (`app/`)
**Status:** Accepted

React + TypeScript application built with Vite. Displays live vehicle positions on an interactive map. Communicates with the backend via REST for static data and WebSocket for live vehicle positions.

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
