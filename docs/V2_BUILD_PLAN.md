# FB-CM Factory V2 Build Plan

V1 reference:
../fb-cm-manager

Do not copy V1 blindly. Use V1 only as reference.

V2 core concepts:
- Workflow
- Workflow Run
- Stage
- Stage Run
- Task
- Task Run
- Character Group
- Group Attribute
- Prompt Builder
- Asset Lifecycle
- Instance Pool
- Scheduler
- Failover Checkpoint

V2 must be modular:
- backend: orchestration API
- frontend: management UI
- host-agent: execution worker agent
- docs: architecture/data model/API docs

Initial implementation order:
1. Docs architecture
2. Database schema
3. Backend API skeleton
4. Host Agent V2 skeleton
5. V1 bridge adapter
6. Workflow Engine MVP