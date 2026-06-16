import { z } from "zod";

export const createWorkflowSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string().default("general"),
  status: z.string().default("draft"),
  createdBy: z.string().optional()
});

export const createWorkflowVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  status: z.string().default("draft"),
  definition: z.record(z.string(), z.unknown()).default({}),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  validation: z.record(z.string(), z.unknown()).default({}),
  createdBy: z.string().optional()
});

export const createWorkflowRunSchema = z.object({
  workspaceId: z.string().optional(),
  workflowId: z.string().min(1),
  workflowVersionId: z.string().optional(),
  name: z.string().min(1),
  priority: z.number().int().default(50),
  input: z.record(z.string(), z.unknown()).default({}),
  runContext: z.record(z.string(), z.unknown()).default({}),
  targetGroupId: z.string().optional(),
  createdBy: z.string().optional()
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type CreateWorkflowVersionInput = z.infer<typeof createWorkflowVersionSchema>;
export type CreateWorkflowRunInput = z.infer<typeof createWorkflowRunSchema>;

