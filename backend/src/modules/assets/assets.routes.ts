import { Router } from "express";
import { createResourceRouter, sendError } from "../shared/resource";
import {
  createAssetRelationSchema,
  createAssetReservationSchema,
  createAssetSchema
} from "./assets.schemas";
import { assetsService } from "./assets.service";

export const assetsRouter = Router();

assetsRouter.use("/", createResourceRouter(createAssetSchema, assetsService));

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

