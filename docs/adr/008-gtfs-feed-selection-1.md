# ADR-008: GTFS Feed Selection

**Date:** 2026-04-22
**Status:** Accepted
**Deciders:** Development Team

---

## Context

The Waltti open data platform (https://opendata.waltti.fi) provides multiple GTFS feeds for Jyväskylä bus data. Our use case is vehicle tracking on a route. We need to decide which feeds to consume and in what priority order.

The assignment requires at least **two** of: trip updates, vehicle positions, service alerts.

---

## Decision

We consume **four** feeds, implemented in `server/src/ingestion/`:

| Feed | Type | File | Refresh Rate | Priority |
|---|---|---|---|---|
| Vehicle Positions | GTFS-RT | `gtfsRtIngestion.ts` | Every 10s | Critical |
| Trip Updates | GTFS-RT | `gtfsRtIngestion.ts` | Every 15s | High |
| Service Alerts | GTFS-RT | `gtfsRtIngestion.ts` | Every 60s | Medium |
| Route & Stop Info | GTFS Static | `staticGtfsIngestion.ts` | On startup | Medium |

### Rationale per feed

**Vehicle Positions (Critical)**
Core of our use case. Without it, the app cannot show where buses are. Refresh every 10 seconds matches typical GTFS-RT provider update intervals.

**Trip Updates (High)**
Provides stop-level delay information for UC-02 (track a single vehicle in detail). Without this, we can only show position, not estimated arrival or delay status.

**Service Alerts (Medium)**
Required by the assignment. Displayed as banners when a route has active disruptions (UC-03). Refreshed less frequently since alerts change slowly.

**GTFS Static (Medium)**
Provides route names, stop locations, and schedule data. Loaded once on startup since static data changes infrequently.

---

## Handling Imperfect Data

GTFS Realtime feeds can be:
- **Missing:** vehicle not yet reporting, or feed temporarily down.
- **Stale:** timestamp in feed is old (> 120 seconds).
- **Inconsistent:** vehicle position exists but no matching trip update.

Our processing layer handles each case:
- Stale data → add `is_stale: true` flag, show UI warning.
- Missing vehicle → show last known position with age label.
- Inconsistent data → show position only, hide delay fields with note.
- Out-of-bounds coordinates → skip that specific point, keep rest of feed.

---

## Consequences

**Positive:**
- Fulfills all three assignment feed requirements.
- Graceful degradation: losing one feed doesn't break the app.
- Independent refresh rates reduce unnecessary load.
- GTFS Static enables route search (UC-04) without repeated API calls.

**Negative:**
- Three separate polling loops to manage for RT feeds.
- Need to correlate vehicle IDs across feeds (positions ↔ trip updates).
