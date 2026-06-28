# Workflow Resource-Driven Model

Workflows are production templates, not strict sequential execution chains.

The preferred model is `workflows.resource_rules_json`, together with capacity config, script mapping, prompt mapping, music policy, and post content policy. New workflow templates should be authored through resource-driven rules.

`workflow_stages` remains in the database and API surface for legacy compatibility with older workflow runs and clients. Do not remove it, but do not use it as the primary model for new production templates.

UI labels should make this distinction clear:

- `Resource-Driven Rules (Recommended)` is the preferred workflow rule editor.
- `Legacy Sequential Stages` refers to the compatibility-only `workflow_stages` model.
