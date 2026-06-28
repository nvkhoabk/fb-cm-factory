# FB CM Factory - Coding Guidelines

## General Rules

- Make small and focused changes.
- Do not rewrite unrelated code.
- Do not change public API behavior unless explicitly requested.
- Do not change database schema without explaining the migration.
- Preserve existing naming conventions.
- Prefer clear code over clever code.

## Backend Rules

- Keep route handlers simple.
- Put business logic into service files.
- Keep database logic separated from API routes.
- Validate input before processing.
- Return consistent error responses.
- Log meaningful errors.

## Frontend Rules

- Keep UI text in Vietnamese unless requested otherwise.
- Preserve current green modern theme.
- Avoid large UI rewrites unless requested.
- Keep components/modules separated where possible.

## Host Agent Rules

- Be careful when changing ADB command logic.
- Do not break existing tap, swipe, screenshot, text input, or instance detection features.
- Add defensive error handling for device not found, timeout, and screenshot failure.
- Keep host-agent compatible with backend APIs.

## Git Rules

- Work on feature branches.
- Do not commit directly to main.
- One branch should handle one feature or one bug.
- Commit messages should be short and meaningful.

## AI Developer Rules

When Codex works on this repository, it should:

1. Read `.ai/project-overview.md`.
2. Read `.ai/architecture.md`.
3. Read `.ai/coding-guidelines.md`.
4. Identify related files before editing.
5. Make the smallest safe change.
6. Explain changed files.
7. Provide test steps.