# UC-01: View Live Vehicles on a Route

**Actor:** Commuter / Passenger
**Goal:** See where all buses on a specific route currently are on a map.

---

## Preconditions
- User has selected or searched for a route (e.g. Route 4)
- GTFS Realtime vehicle positions feed is available

## Main Flow
1. User opens the app and selects a route by number or name
2. System fetches live vehicle positions for that route from GTFS Realtime
3. System displays all active vehicles on a map with their current position
4. Vehicles update automatically every 10–15 seconds
5. User can tap/click a vehicle to see details (trip ID, direction, speed)

## Alternative Flows
- **A-1:** No vehicles currently active on route → show message "No active vehicles on this route right now"
- **A-2:** Feed data is stale (> 120s old) → show warning banner "Data may be outdated"

## Postconditions
User can see where the next bus is and estimate arrival.
