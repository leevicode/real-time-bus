# ADR-008: GTFS Realtime Feed Selection

**Date:** 2026-04-22
**Status:** Proposed
**Deciders:** Development Team

---

## Context

The Waltti open data platform (https://opendata.waltti.fi) provides multiple GTFS Realtime feeds for Jyväskylä bus data. Our use case is vehicle tracking on a route. We need to decide which feeds to consume and in what priority order.

The assignment requires at least **two** of: trip updates, vehicle positions, service alerts.

---

## Decision

We will consume **all three** feeds, with the following priority and refresh strategy:

| Feed | Endpoint Type | Refresh Rate | Priority |
|---|---|---|---|
| Vehicle Positions | GTFS-RT VehiclePosition | Every 10s | Critical |
| Trip Updates | GTFS-RT TripUpdate | Every 15s | High |
| Service Alerts | GTFS-RT Alert | Every 60s | Medium |

### Rationale per feed

**Vehicle Positions (Critical)**
This is the core of our use case. Without it, the app cannot show where buses are. Refresh every 10 seconds matches typical GTFS-RT provider update intervals.

**Trip Updates (High)**
Trip updates give us stop-level delay information — essential for UC-02 (track a single vehicle in detail). Without this, we can only show position, not estimated arrival or delay status.

**Service Alerts (Medium)**
Required by the assignment. Displayed as banners when a route has active disruptions (UC-03). Refreshed less frequently since alerts change slowly.

---

## Handling Imperfect Data

GTFS Realtime feeds can be:
- **Missing:** vehicle not yet reporting, or feed temporarily down
- **Stale:** timestamp in feed is old (> 120 seconds)
- **Inconsistent:** vehicle position exists but no matching trip update

Our processing layer will handle each case:
- Stale data → add `is_stale: true` flag, show UI warning
- Missing vehicle → show last known position with age label
- Inconsistent data → show position only, hide delay fields with note
- Out-of-bounds coordinates → skip that specific point, not the whole feed

---

## Consequences

**Positive:**
- Fulfills all three assignment feed requirements
- Graceful degradation: losing one feed doesn't break the app
- Independent refresh rates reduce unnecessary load

**Negative:**
- Three separate polling loops to manage
- Need to correlate vehicle IDs across feeds (positions ↔ trip updates)
