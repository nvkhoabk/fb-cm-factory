import { Router } from "express";
import { sendError } from "../shared/resource";
import { updateCharacterSchema } from "./characters.schemas";
import { charactersService } from "./characters.service";

export const charactersRouter = Router();

charactersRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: charactersService.list() });
});

charactersRouter.get("/:id/detail", (req, res) => {
  const data = charactersService.detail(req.params.id);
  if (!data) return res.status(404).json({ ok: false, error: { code: "CHARACTER_NOT_FOUND", message: "Character not found" } });
  return res.json({ ok: true, data });
});

charactersRouter.get("/:id/groups", (req, res) => {
  res.json({ ok: true, data: charactersService.groups(req.params.id) });
});

charactersRouter.get("/:id/assets", (req, res) => {
  res.json({ ok: true, data: charactersService.assets(req.params.id) });
});

charactersRouter.get("/:id/jobs", (req, res) => {
  res.json({ ok: true, data: charactersService.jobs(req.params.id) });
});

charactersRouter.get("/:id", (req, res) => {
  const data = charactersService.get(req.params.id);
  if (!data) return res.status(404).json({ ok: false, error: { code: "CHARACTER_NOT_FOUND", message: "Character not found" } });
  return res.json({ ok: true, data });
});

charactersRouter.patch("/:id", (req, res) => {
  try {
    const input = updateCharacterSchema.parse(req.body ?? {});
    const data = charactersService.update(req.params.id, input);
    if (!data) return res.status(404).json({ ok: false, error: { code: "CHARACTER_NOT_FOUND", message: "Character not found" } });
    return res.json({ ok: true, data });
  } catch (error) {
    return sendError(res, error);
  }
});

charactersRouter.delete("/:id", (req, res) => {
  try {
    const data = charactersService.delete(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: { code: "CHARACTER_NOT_FOUND", message: "Character not found" } });
    return res.json({ ok: true, data });
  } catch (error) {
    return sendError(res, error);
  }
});
