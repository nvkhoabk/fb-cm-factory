# FB CM Factory - Project Overview

## Purpose

FB CM Factory is an AI automation management platform for controlling multiple AI/browser/LDPlayer instances, managing media assets, running scripts, and orchestrating image/video/music generation workflows.

## Main Goals

- Manage multiple hosts and instances.
- Control browser or LDPlayer instances remotely.
- Capture screenshots and support Live Viewer.
- Run scripted automation workflows.
- Manage image and media assets.
- Support AI-assisted image, video, and music workflows.
- Provide a dashboard for monitoring, control, and reporting.

## Main Components

- Backend Control Server
- Frontend Dashboard
- Host Agent
- Instance Manager
- Live Viewer
- Asset Manager
- Script / Workflow Engine
- SQLite Database
- WebSocket Realtime Layer

## Current Development Direction

The project is moving toward a GitHub + Codex workflow.

ChatGPT is used for architecture, planning, and technical guidance.

Codex is used as the AI developer to read the repository, implement features, fix bugs, refactor modules, and create pull requests.

## Important Rules

- Do not rewrite the whole project.
- Do not change existing APIs unless explicitly requested.
- Do not change database schema unless migration is clearly required.
- Keep patches small and focused.
- Preserve backward compatibility.
- Explain changed files and testing steps after every implementation.