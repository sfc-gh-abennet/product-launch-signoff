# Product Launch Signoff



## Overview

Product Launch Signoff is a comprehensive app designed to streamline the product launch process by providing directors and leadership with a centralized, real-time view of launch readiness across all critical product features and requirements.

## Key Features

This application empowers leadership teams to:

- **Track Launch Readiness**: Monitor completion status of essential product launch gates including security reviews, compliance audits, documentation, QA testing, and regulatory approvals
- **Executive Dashboard**: Get a high-level summary view of which features are ready for launch and which still require attention
- **Gate Management**: Organize and track different types of launch requirements such as:
  - Security & Privacy compliance
  - Documentation completeness
  - Quality assurance validation
  - Legal and regulatory approvals
  - Marketing and sales readiness
  - Technical infrastructure verification
- **Status Visualization**: Clear visual indicators showing completion status, blockers, and progress across all launch criteria
- **Leadership Insights**: Quickly identify bottlenecks, at-risk features, and areas requiring executive attention or resource allocation

## Benefits

- **Centralized Visibility**: All launch criteria and their status in one consolidated view
- **Informed Decision Making**: Real-time data to make confident go/no-go launch decisions
- **Risk Mitigation**: Early identification of incomplete requirements and potential launch blockers
- **Accountability**: Clear ownership and tracking of responsibilities across teams
- **Streamlined Communication**: Reduce status meetings and email chains with always-current launch status

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

Once you have logged into the CLI (`forge login`), follow the steps below to install the app onto your site:

1. Clone this repository:
    
    `git clone <repository-url>`
1. Change to the app directory:

    `cd product-launch-signoff`

1. Register the app:
   
    `forge register`

1. Build and deploy your app by running:

    `forge deploy`

1. Install your app in an Atlassian site by running:

    `forge install`

1. Develop your app by running `forge tunnel` to proxy invocations locally:

    `forge tunnel`

## Installation

1. Run `forge deploy` to deploy the app to your environment.
1. Navigate to any Jira project where you're tracking product features or launch requirements.
1. You're ready to start tracking your product launch readiness! Access the Product Launch Signoff panel from the issue view to begin monitoring your launch gates and checklists.

## Usage

### For Directors and Leadership:
- **Executive Summary**: View high-level completion percentages across all launch criteria
- **Feature Readiness**: See which product features are fully approved and ready for launch
- **Risk Assessment**: Identify features with incomplete requirements that may impact launch timelines
- **Team Performance**: Monitor progress across different departments (Security, Legal, QA, Documentation, etc.)

### For Product Teams:
- **Gate Tracking**: Update completion status for security reviews, compliance checks, documentation, and other launch requirements
- **Checklist Management**: Maintain detailed checklists for each launch criterion
- **Progress Updates**: Provide real-time status updates visible to leadership
- **Collaboration**: Coordinate with different teams to ensure all launch requirements are met

This app is designed to be highly configurable for different organizations and product types. You can customize the launch gates, checklists, and approval workflows by editing the configuration files in the `src/` directory.

## Debugging

You can enable verbose logging by setting the `DEBUG_LOGGING` [environment variable](https://developer.atlassian.com/platform/forge/environments/) to `1`. Logs can then be viewed with the `forge logs` command.

Alternatively, you can use the [`forge tunnel`](https://developer.atlassian.com/platform/forge/change-the-frontend-with-forge-ui/#set-up-tunneling) command to run your Forge app locally. Note that you must pass the environment variable values to the tunnel with the prefix `FORGE_USER_VAR_`, e.g.:

```
FORGE_USER_VAR_DEBUG_LOGGING=1 forge tunnel
```


