# 004 Use Node.js and Express for Backend

Date: 30.3.2026 (Original)
Last Amended: 11.4.2026
Authors: Development Team

## Status
Accepted (Amended)

## Context
We need a backend to fetch, parse, and serve transit data (GTFS) as JSON. We considered Python/Flask for its data handling capabilities, but prioritized the team's current skills.

## Decision
We will use Node.js and Express. The team is already familiar with Node.js, allowing us to maintain high development velocity without the overhead of learning Python.

## Consequences
* **Positive:** Developers can work full-stack with JavaScript.
* **Negative:** We need multiple npm packages instead of relying on Python's robust built-in data tools.