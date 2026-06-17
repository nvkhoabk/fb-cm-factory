import { Router } from "express";
import { config } from "../config";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: "ok",
      hostId: config.hostId,
      agentName: config.agentName,
      mockMode: config.mockMode
    }
  });
});
