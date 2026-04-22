# UC-04: Search for a Route

**Actor:** New or infrequent user
**Goal:** Find the right route without knowing the route number.

---

## Preconditions
- App is open

## Main Flow
1. User types a destination or stop name in the search bar
2. System suggests matching routes from GTFS static data
3. User selects a route → proceeds to UC-01

## Alternative Flows
- **A-1:** No matching routes found → show "No routes found for your search"
- **A-2:** Multiple matches → show list for user to choose from

## Postconditions
User has selected a route and can begin tracking vehicles.
