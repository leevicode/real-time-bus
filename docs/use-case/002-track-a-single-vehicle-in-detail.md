# UC-02: Track a Single Vehicle in Detail

**Actor:** Commuter waiting at a stop
**Goal:** Follow one specific vehicle and see its progress along the route.

---

## Preconditions
- User has identified a vehicle from UC-01

## Main Flow
1. User selects a specific vehicle on the map
2. System shows detailed panel: current stop, next stop, delay status
3. System fetches trip update data (stop time updates) for that vehicle
4. Map centers/follows the selected vehicle
5. Panel updates in real time

## Alternative Flows
- **A-1:** Trip update data unavailable → show only position, hide delay info with note "Delay information unavailable"
- **A-2:** Vehicle disappears from feed mid-tracking → notify user "Vehicle signal lost" and stop auto-updating

## Postconditions
User knows exactly where their bus is and whether it is delayed.
