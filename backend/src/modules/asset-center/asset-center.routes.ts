import { Router } from "express";
import { assetCenterService } from "./asset-center.service";

export const assetCenterRouter = Router();

assetCenterRouter.get("/items", (req, res) => {
  res.json({ ok: true, data: assetCenterService.list(req.query) });
});
