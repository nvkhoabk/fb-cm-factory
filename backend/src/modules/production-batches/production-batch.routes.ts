import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  batchTypeSchema,
  createBatchUsageSchema,
  createProductionBatchItemSchema,
  createProductionBatchSchema,
  updateProductionBatchSchema
} from "./production-batch.schemas";
import { productionBatchService } from "./production-batch.service";

export const productionBatchRouter = Router();

productionBatchRouter.get("/ready/:batchType", (req, res) => {
  try {
    const batchType = batchTypeSchema.parse(req.params.batchType);
    res.json({ ok: true, data: productionBatchService.listReady(batchType) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: productionBatchService.list() });
});

productionBatchRouter.post("/", (req, res) => {
  try {
    const input = createProductionBatchSchema.parse(req.body);
    res.status(201).json({ ok: true, data: productionBatchService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/launch", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.launch(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.get(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.get("/:id/lineage", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.getBatchLineage(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.patch("/:id", (req, res) => {
  try {
    const input = updateProductionBatchSchema.parse(req.body);
    res.json({ ok: true, data: productionBatchService.update(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/items", (req, res) => {
  try {
    const input = createProductionBatchItemSchema.parse(req.body);
    res.status(201).json({ ok: true, data: productionBatchService.addItem(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/use", (req, res) => {
  try {
    const input = createBatchUsageSchema.parse(req.body);
    res.status(201).json({ ok: true, data: productionBatchService.createBatchUsage(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.delete("/:id/items/:itemId", (req, res) => {
  try {
    productionBatchService.deleteItem(req.params.id, req.params.itemId);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.delete("/:id", (req, res) => {
  try {
    productionBatchService.delete(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/reserve", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.reserve(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/mark-ready", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.markReady(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/mark-used", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.markUsed(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

productionBatchRouter.post("/:id/release", (req, res) => {
  try {
    res.json({ ok: true, data: productionBatchService.release(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});
