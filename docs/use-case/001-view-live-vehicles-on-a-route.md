# UC-01: View Live Vehicles on a Route

**Status:** Proposed
**Actor:** Commuter / Passenger
**Goal:** See real-time positions of all buses on a chosen route.

---

## Preconditions
- GTFS Realtime vehicle positions feed is available.

## Main Flow
1. User opens the app and selects a route by number or name.
2. System fetches live vehicle positions for that route from GTFS Realtime.
3. System displays all active vehicles on a map with their current position.
4. Vehicles update automatically every 10–15 seconds.

## Alternative Flows
- **A-1:** No vehicles currently active on route → show message "No active vehicles on this route right now."
- **A-2:** Feed data is stale (> 120s old) → show warning banner "Data may be outdated."
- **A-3:** User taps a vehicle → show details panel (trip ID, direction, speed).

## Postconditions
Vehicle positions are displayed on the map and continue to update.
