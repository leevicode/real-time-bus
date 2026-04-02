# 001 Record Architecture Decisions

## Status

Accepted

## Context

With the project growing, we are making important technical and architectural decisions. We went through some of the possible risks and decided that it is mandatory to have a standardized and lightweight documentation style. The reason being that we need to be able to see why something was made a certain way, and so the information can be revised in the future.

## Decision

We will use Michael Nygard's architecture decision record template, and we are going to save these files to the project's GitHub repository under the `docs/adr/` folder with a running number. All significant changes to architectural design, technologies, or dependencies will require an ADR document.

## Consequences

* **Positive:** Re-evaluating past decisions is simpler since the original reasoning is easily available.
* **Negative:** It requires slightly more time and discipline from developers to write an ADR.