# 005 Use Nix for CI/CD pipeline

Date: 11.4.2026
Authors: Development Team

## Status
Accepted

## Context
Ubuntu runners use npm, pip, and system packages using apt-get. This approach usually leads to recurring issues: inconsistent dependency versions between local development and CI, "works on my machine" failures, slow pipeline runs due to full dependency re-installs on every job, and difficulty reproducing production build environments exactly. We need a reliable and reproducible CI/CD solution. We evaluated Docker-based approaches and Nix. Docker offers better ecosystem maturity, but Nix flakes provide stronger reproducibility guarantees at a finer granularity and potentially faster incremental builds for the build environment.

## Decision
We will adopt the **Nix package manager** for all CI/CD pipelines. We will use Nix Flakes to define our build environments, ensuring that the exact same versions of tools are used across all stages of development and deployment.

## Consequences
* **Positive:** Guaranteed identical environments between local and CI.
* **Positive:** Faster builds through granular caching.
* **Negative:** Steep learning curve for the team.
* **Negative:** Requires active disk space management (/nix/store).
* **Negative:** Nix flakes are still considered experimental.