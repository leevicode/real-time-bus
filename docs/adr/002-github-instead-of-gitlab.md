# 002 Use GitHub instead of GitLab

Date: 30.3.2026
Authors: Development Team

## Status

Accepted

## Context

As we establish our development workflow, we need a robust version control and collaboration platform to host our repository, manage issues, and run our CI/CD pipelines. We evaluated both GitHub and GitLab. While both platforms offer excellent features for software development, we needed to select the one that minimizes friction and best aligns with our team's existing skill set and needs.

## Decision

We will use GitHub instead of GitLab as our primary version control and collaboration platform. We chose GitHub primarily due to the team's prior familiarity with the platform, its extensive community ecosystem, and the ease of setting up CI/CD pipelines using GitHub Actions.

## Consequences

* **Positive:** We can easily utilize GitHub Actions for automation without needing third-party tools.
* **Negative:** If we build our automation using GitHub Actions, those scripts will only work on GitHub. Moving to another platform later would require rewriting the automation from scratch.