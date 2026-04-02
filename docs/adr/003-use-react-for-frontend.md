# 003 Use React for Frontend Development

## Status

Accepted

## Context

We are developing the frontend interface for our application. We need to select a frontend framework or library that allows for efficient UI development, state management, and API integration. We need a solution that enables rapid development without a steep learning curve for the current team.

## Decision

We will use React as our primary frontend technology. The deciding factor is that the team is already familiar with React compared to other frameworks.

## Consequences

* **Positive:** Development can start immediately with minimal friction since the team can rely on existing knowledge.
* **Negative:** Because React is a UI library rather than a fully-featured framework, we may need to make additional architectural decisions and write more ADRs in the future for things like routing or global state management if the application grows in complexity.