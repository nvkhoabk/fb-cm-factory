import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createAssetRelationSchema,
  createAssetReservationSchema,
  createAssetSchema,
  updateAssetSchema
} from "./assets.schemas";
import { assetsService } from "./assets.service";

export const assetsRouter = Router();

assetsRouter.get("/", (req, res) => {
  res.json({ ok: true, data: assetsService.list(req.query as Record<string, unknown>) });
});

assetsRouter.get("/categories", (_req, res) => {
  res.json({ ok: true, data: assetsService.categories() });
});

assetsRouter.post("/", (req, res) => {
  try {
    const payload = createAssetSchema.parse(req.body);
    res.status(201).json({ ok: true, data: assetsService.create(payload) });
  } catch (error) {
    sendError(res, error);
  }
});

assetsRouter.get("/:id", (req, res) => {
  const data = assetsService.get(req.params.id);
  if (!data) return res.status(404).json({ ok: false, error: { code: "ASSET_NOT_FOUND", message: "Asset not found" } });
  return res.json({ ok: true, data });
});

assetsRouter.patch("/:id", (req, res) => {
  try {
    const payload = updateAssetSchema.parse(req.body ?? {});
    const data = assetsService.update(req.params.id, payload);
    if (!data) return res.status(404).json({ ok: false, error: { code: "ASSET_NOT_FOUND", message: "Asset not found" } });
    return res.json({ ok: true, data });
  } catch (error) {
    return sendError(res, error);
  }
});

assetsRouter.delete("/:id", (req, res) => {
  if (!assetsService.delete(req.params.id)) {
    return res.status(404).json({ ok: false, error: { code: "ASSET_NOT_FOUND", message: "Asset not found" } });
  }
  return res.json({ ok: true, data: { deleted: true } });
});

assetsRouter.post("/:id/set-best", (req, res) => {
  const data = assetsService.setBest(req.params.id);
  if (!data) return res.status(404).json({ ok: false, error: { code: "ASSET_NOT_FOUND", message: "Asset not found" } });
  return res.json({ ok: true, data });
});

assetsRouter.get("/:assetId/relations", (req, res) => {
  res.json({ ok: true, data: assetsService.listRelations(req.params.assetId) });
});

assetsRouter.post("/relations", (req, res) => {
  try {
    const payload = createAssetRelationSchema.parse(req.body);
    res.status(201).json({ ok: true, data: assetsService.createRelation(payload) });
  } catch (error) {
    sendError(res, error);
  }
});

assetsRouter.get("/:assetId/reservations", (req, res) => {
  res.json({ ok: true, data: assetsService.listReservations(req.params.assetId) });
});

assetsRouter.post("/:assetId/reservations", (req, res) => {
  try {
    const payload = createAssetReservationSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: assetsService.createReservation(req.params.assetId, payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});
