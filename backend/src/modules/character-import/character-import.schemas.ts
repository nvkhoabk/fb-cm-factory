import { z } from "zod";

export const importFileSchema = z.object({
  fileName: z.string().min(1),
  dataUrl: z.string().optional(),
  publicUrl: z.string().optional(),
  filePath: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional()
});

export const importPairSchema = z.object({
  young: importFileSchema,
  old: importFileSchema,
  createGroupCandidates: z.boolean().default(false),
  dryRun: z.boolean().default(false)
});

export const importBulkSchema = z.object({
  files: z.array(importFileSchema).min(1),
  createGroupCandidates: z.boolean().default(false),
  dryRun: z.boolean().default(false)
});

export type ImportFileInput = z.infer<typeof importFileSchema>;
export type ImportPairInput = z.infer<typeof importPairSchema>;
export type ImportBulkInput = z.infer<typeof importBulkSchema>;
