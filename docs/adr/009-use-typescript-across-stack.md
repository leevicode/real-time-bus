# 009 Use TypeScript across the stack

Date: 24.4.2026
Authors: Development Team

## Status
Accepted

## Context
Our project consists of a Node.js backend and a React-based frontend. JavaScript's dynamic typing often leads to runtime errors that are difficult to debug, especially as the codebase grows. We need a way to ensure type safety, improve developer experience, and catch common bugs during the build process rather than in production.

## Decision
We will use TypeScript across the stack.

## Consequences
* **Positive:** Type Safety: Catching type-related errors at compile time reduces bugs in production.
* **Positive:** Using the same language (TS) across the entire stack simplifies the development process for all team members.
* **Negative:** TypeScript usually requires writing more code upfront.
* **Negative:** Adds a mandatory build step (compilation via tsc). This can be integrated into the existing development and CI pipelines.