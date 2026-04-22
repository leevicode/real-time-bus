# UC-05: Handle Degraded Data Gracefully

**Actor:** System (non-interactive)
**Goal:** Never show the user a broken or misleading experience when data is missing or corrupted.

---

## Triggers
- Feed timeout
- Partial or missing data
- Inconsistent or stale timestamps
- Out-of-bounds GPS coordinates

## Behaviors

| Situation | System Response |
|---|---|
| GPS timestamp > 120s old | Add `is_stale: true` flag, show "Last updated X seconds ago" |
| Data > 120s old | Grey out vehicle markers, show staleness warning |
| Feed completely unreachable | Show friendly error with retry button |
| Coordinates outside Jyväskylä bounds | Skip that GPS point, keep rest of feed |
| Speed > 100 km/h | Ignore that specific data point |
| `delay` field is null | Default to 0 to prevent crashes |

## Rules
- Never crash or show raw error messages to the user
- Always show last known position rather than nothing
- Degrade gracefully: partial data is better than no data

## Postconditions
User always sees a meaningful UI state, even when data quality is poor.
