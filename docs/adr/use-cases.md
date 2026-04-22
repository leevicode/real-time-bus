# Use Cases — Vehicle Tracking on a Route

**Project:** Jyväskylä Realtime Public Transport App  
**Use Case Focus:** Vehicle Tracking on a Route  

---

## UC-01: View Live Vehicles on a Route

**Actor:** Commuter / Passenger  
**Goal:** See where all buses on a specific route currently are on a map.

**Preconditions:**
- User has selected or searched for a route (e.g. Route 4)
- GTFS Realtime vehicle positions feed is available

**Main Flow:**
1. User opens the app and selects a route by number or name
2. System fetches live vehicle positions for that route from GTFS Realtime
3. System displays all active vehicles on a map with their current position
4. Vehicles update automatically every 10–15 seconds
5. User can tap/click a vehicle to see details (trip ID, direction, speed)

**Alternative Flows:**
- A-1: No vehicles currently active on route → show message "No active vehicles on this route right now"
- A-2: Feed data is stale (> 60s old) → show warning banner "Data may be outdated"

**Postconditions:** User can see where the next bus is and estimate arrival.

---

## UC-02: Track a Single Vehicle in Detail

**Actor:** Commuter waiting at a stop  
**Goal:** Follow one specific vehicle and see its progress along the route.

**Preconditions:**
- User has identified a vehicle from UC-01

**Main Flow:**
1. User selects a specific vehicle on the map
2. System shows detailed panel: current stop, next stop, delay status
3. System fetches trip update data (stop time updates) for that vehicle
4. Map centers/follows the selected vehicle
5. Panel updates in real time

**Alternative Flows:**
- A-1: Trip update data unavailable → show only position, hide delay info with note "Delay information unavailable"
- A-2: Vehicle disappears from feed mid-tracking → notify user "Vehicle signal lost" and stop auto-updating

---

## UC-03: See Service Alerts for a Route

**Actor:** Any user  
**Goal:** Know about disruptions, detours, or cancellations before relying on the route.

**Preconditions:**
- User is viewing a route

**Main Flow:**
1. System checks GTFS Realtime service alerts feed for the selected route
2. If alerts exist, a banner or badge is shown prominently on the route view
3. User taps the alert to read full description and affected time window
4. System shows severity: INFO / WARNING / SEVERE

**Alternative Flows:**
- A-1: No alerts → no banner shown (do not clutter UI)
- A-2: Alert feed unreachable → silently skip (do not block main tracking functionality)

---

## UC-04: Search for a Route

**Actor:** New or infrequent user  
**Goal:** Find the right route without knowing the route number.

**Main Flow:**
1. User types a destination or stop name in the search bar
2. System suggests matching routes from GTFS static data
3. User selects a route → goes to UC-01

---

## UC-05: Handle Degraded Data Gracefully

**Actor:** System (non-interactive)  
**Goal:** Never show the user a broken or misleading experience when data is missing.

**Triggers:** Feed timeout, partial data, inconsistent timestamps

**Behaviors:**
- Show last known position with a "Last updated X seconds ago" label
- If data is > 120s old, grey out vehicle markers and show staleness warning
- If feed is completely unreachable, show friendly error with retry button
- Never crash or show raw error messages to the user

---

## Summary Table

| ID    | Use Case                        | GTFS Feed Used                        | Priority |
|-------|---------------------------------|---------------------------------------|----------|
| UC-01 | View live vehicles on a route   | Vehicle Positions                     | High     |
| UC-02 | Track a single vehicle          | Vehicle Positions + Trip Updates      | High     |
| UC-03 | See service alerts for a route  | Service Alerts                        | Medium   |
| UC-04 | Search for a route              | GTFS Static                           | Medium   |
| UC-05 | Handle degraded data            | All feeds                             | High     |
