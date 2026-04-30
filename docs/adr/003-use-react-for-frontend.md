# 003 Use React for Frontend Development

Date: 30.3.2026
Authors: Development Team

## Status

Accepted

## Context

We are developing the frontend interface for our application. We need to select a frontend framework or library that allows for efficient UI development, state management, and API integration. We need a solution that enables rapid development without a steep learning curve for the current team.

## Decision

We will use React as our primary frontend technology. The deciding factor is that the team is already familiar with React compared to other frameworks.

## Consequences

* **Positive:** Development can start immediately with minimal friction since the team can rely on existing knowledge.
* **Negative:** React is a UI library, not a full framework. We will need separate decisions for routing and state management.
* **Negative:** As complexity grows, we will likely write additional ADRs for concerns that opinionated frameworks like Next.js provide out of the box.