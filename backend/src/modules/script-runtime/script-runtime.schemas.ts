import { z } from "zod";

export const scriptRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "PAUSED",
  "FAILED",
  "FAILED_RECOVERABLE",
  "COMPLETED"
]);

export const supportedScriptStepTypeSchema = z.enum([
  "wait",
  "screenshot",
  "tap",
  "swipe",
  "long-press",
  "scroll-to-end",
  "send-text",
  "send-text-submit",
  "send-key",
  "upload-file",
  "clear-download",
  "cleanup-factory-temp",
  "download-latest",
  "check-screen",
  "wait-screen",
  "if",
  "retry",
  "run-sub-script",
  "download-result"
]);

export const scriptStepDefinitionSchema = z.object({
  stepNo: z.number().int().positive().optional(),
  stepType: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()).default({})
}).refine((step) => Boolean(step.stepType || step.type), {
  message: "stepType or type is required"
});

export const createScriptSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT", "UTILITY"]).default("UTILITY"),
  description: z.string().optional(),
  status: z.string().default("active")
});

export const updateScriptSchema = createScriptSchema.partial();

export const createScriptVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  status: z.string().default("active"),
  definition: z.object({
    steps: z.array(scriptStepDefinitionSchema).min(1)
  }).optional(),
  steps: z.array(scriptStepDefinitionSchema).min(1).optional(),
  variables: z.record(z.string(), z.unknown()).default({}),
  retryPolicy: z.record(z.string(), z.unknown()).default({}),
  detectionPolicy: z.record(z.string(), z.unknown()).default({})
}).refine((input) => Boolean(input.definition || input.steps), {
  message: "definition or steps is required"
});

export const updateScriptVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  status: z.string().optional(),
  definition: z.object({
    steps: z.array(scriptStepDefinitionSchema).min(1)
  }).optional(),
  steps: z.array(scriptStepDefinitionSchema).min(1).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
  retryPolicy: z.record(z.string(), z.unknown()).optional(),
  detectionPolicy: z.record(z.string(), z.unknown()).optional()
});

export const runScriptSchema = z.object({
  scriptId: z.string().min(1).optional(),
  scriptVersionId: z.string().min(1).optional(),
  context: z.record(z.string(), z.unknown()).default({})
});

export const testRunScriptSchema = z.object({
  scriptVersionId: z.string().min(1).optional(),
  hostId: z.string().min(1),
  hostDbId: z.string().min(1).optional(),
  instanceId: z.string().min(1),
  localId: z.union([z.string(), z.number()]).optional(),
  adbId: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({})
});

export type ScriptRunStatus = z.infer<typeof scriptRunStatusSchema>;
export type ScriptStepDefinition = z.infer<typeof scriptStepDefinitionSchema>;
export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type CreateScriptVersionInput = z.infer<typeof createScriptVersionSchema>;
export type UpdateScriptVersionInput = z.infer<typeof updateScriptVersionSchema>;
export type RunScriptInput = z.infer<typeof runScriptSchema>;
export type TestRunScriptInput = z.infer<typeof testRunScriptSchema>;
