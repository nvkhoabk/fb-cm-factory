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
  "send-text",
  "send-key",
  "check-screen",
  "download-result"
]);

export const scriptStepDefinitionSchema = z.object({
  stepNo: z.number().int().positive().optional(),
  stepType: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()).default({})
}).refine((step) => Boolean(step.stepType || step.type), {
  message: "stepType or type is required"
});

export const createScriptSchema = z.object({
  name: z.string().min(1),
  status: z.string().default("active")
});

export const createScriptVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  status: z.string().default("active"),
  definition: z.object({
    steps: z.array(scriptStepDefinitionSchema).min(1)
  })
});

export const runScriptSchema = z.object({
  scriptId: z.string().min(1).optional(),
  scriptVersionId: z.string().min(1).optional(),
  context: z.record(z.string(), z.unknown()).default({})
});

export type ScriptRunStatus = z.infer<typeof scriptRunStatusSchema>;
export type ScriptStepDefinition = z.infer<typeof scriptStepDefinitionSchema>;
export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type CreateScriptVersionInput = z.infer<typeof createScriptVersionSchema>;
export type RunScriptInput = z.infer<typeof runScriptSchema>;
