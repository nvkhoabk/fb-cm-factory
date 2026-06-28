# FB CM Factory - Architecture

## High-Level Architecture

The system consists of:

1. Frontend Dashboard
2. Backend Control Server
3. Host Agent
4. SQLite Database
5. WebSocket Realtime Layer
6. External AI / Browser / LDPlayer environments

## Frontend Dashboard

The dashboard is used to:

- View system status.
- Manage hosts.
- Manage instances.
- View screenshots.
- Open Live Viewer.
- Manage assets.
- Configure scripts/workflows.
- Monitor task execution.

## Backend Control Server

The backend is responsible for:

- REST API endpoints.
- Authentication and authorization.
- Host and instance management.
- Workflow management.
- Asset management.
- Database access.
- WebSocket event broadcasting.
- Communication with Host Agent.

## Host Agent

The Host Agent runs on the machine that controls browser profiles or LDPlayer instances.

It is responsible for:

- Detecting running instances.
- Executing ADB or browser control commands.
- Capturing screenshots.
- Performing tap/swipe/text actions.
- Reporting instance status to the backend.

## Database

SQLite is used in the MVP stage.

The database stores:

- Hosts
- Instances
- Users
- Scripts / Workflows
- Assets
- Script runs
- Logs
- Configuration

## Realtime Layer

WebSocket is used for:

- Instance status updates.
- Screenshot refresh events.
- Script execution progress.
- Host status events.
- Live Viewer status.

## Design Principle

The project should stay modular.

Route files should be thin.

Business logic should be placed in services.

Database access should be isolated in database/service layers.