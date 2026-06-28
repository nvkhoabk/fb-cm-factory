import { Router } from "express";
import { sendError } from "../shared/resource";
import { characterImportService } from "./character-import.service";
import { importBulkSchema, importFileSchema, importPairSchema } from "./character-import.schemas";

export const characterImportRouter = Router();

characterImportRouter.get("/preview", (req, res) => {
  try {
    const rawFiles = typeof req.query.files === "string" ? JSON.parse(req.query.files) : [];
    const files = importFileSchema.array().parse(rawFiles);
    res.json({ ok: true, data: characterImportService.preview(files) });
  } catch (error) {
    sendError(res, error);
  }
});

characterImportRouter.post("/pair", async (req, res) => {
  try {
    const input = importPairSchema.parse(req.body);
    res.json({ ok: true, data: await characterImportService.importPair(input) });
  } catch (error) {
    sendError(res, error);
  }
});

characterImportRouter.post("/bulk", async (req, res) => {
  try {
    const input = importBulkSchema.parse(req.body);
    res.json({ ok: true, data: await characterImportService.importBulk(input) });
  } catch (error) {
    sendError(res, error);
  }
});

characterImportRouter.get("/history", (_req, res) => {
  res.json({ ok: true, data: characterImportService.history() });
});
