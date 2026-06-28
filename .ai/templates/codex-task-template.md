# Codex Task Template

## Task Title

[Viết tên task ngắn gọn]

## Objective

[Mô tả mục tiêu cần làm]

## Context

Before working, read:

- `.ai/project-overview.md`
- `.ai/architecture.md`
- `.ai/coding-guidelines.md`

## Scope

Codex should only modify files related to this task.

Allowed areas:

- [Ví dụ: backend routes]
- [Ví dụ: backend services]
- [Ví dụ: frontend asset manager]

Do not modify:

- Unrelated APIs
- Database schema unless explicitly requested
- Existing working features
- Deployment files unless needed

## Requirements

- [Yêu cầu 1]
- [Yêu cầu 2]
- [Yêu cầu 3]

## Expected Output

Codex should provide:

1. Summary of changes
2. List of changed files
3. Test steps
4. Risk notes

## Test Instructions

Run:

```bash
npm install
npm run build
npm test
```

If some scripts do not exist, explain what can be tested manually.

## Done Criteria
- Feature works as requested
- No unrelated files changed
- Existing behavior is preserved
- Test steps are provided