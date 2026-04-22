# UC-03: See Service Alerts for a Route

**Actor:** Any user
**Goal:** Know about disruptions, detours, or cancellations before relying on the route.

---

## Preconditions
- User is viewing a route

## Main Flow
1. System checks GTFS Realtime service alerts feed for the selected route
2. If alerts exist, a banner or badge is shown prominently on the route view
3. User taps the alert to read full description and affected time window
4. System shows severity: INFO / WARNING / SEVERE

## Alternative Flows
- **A-1:** No alerts → no banner shown (do not clutter UI)
- **A-2:** Alert feed unreachable → silently skip, do not block main tracking functionality

## Postconditions
User is informed of any active disruptions before travelling.
