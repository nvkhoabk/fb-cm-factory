import cors from "cors";
import express from "express";
import { config } from "./config";
import { adbRouter } from "./adb/adb.routes";
import { healthRouter } from "./health/health.routes";
import { instanceRouter } from "./instances/instance.routes";
import { ldplayerRouter } from "./ldplayer/ldplayer.routes";
import { storageRouter } from "./storage/storage.routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/storage", express.static(config.hostStorageRoot));

app.use("/health", healthRouter);
app.use("/adb", adbRouter);
app.use("/instances", instanceRouter);
app.use("/ldplayer", ldplayerRouter);
app.use("/storage-api", storageRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `No route for ${req.method} ${req.path}`
    }
  });
});
