# 006 Host on Azure App Service

Date: 11.4.2026
Authors: Development Team

## Status
Accepted

## Context
We need a cloud platform to host the real-time bus application. As this is a student project, we require a cost-effective solution that is easy to manage. We need a platform that integrates with our Nix-based build process and GitHub Actions. Azure was chosen due to the availability of the Azure for Students credits and the team's prior experience with the platform.

## Decision
We will host the application on Azure App Service (Web Apps).

## Consequences
* **Positive:** Utilizing the Azure for Students subscription allows us to host the application for free.
* **Positive:** Seamless integration with GitHub Actions for automated CI/CD.
* **Negative:** The Free tier has strict CPU, RAM, and storage limits, which may affect performance if the load increases.