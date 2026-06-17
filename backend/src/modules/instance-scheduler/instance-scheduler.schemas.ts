import { z } from "zod";

export const allocationStatusSchema = z.enum(["ALLOCATED", "RELEASED", "FAILED"]);

export type AllocationStatus = z.infer<typeof allocationStatusSchema>;

