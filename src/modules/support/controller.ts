import { Router } from "express";
import SupportService from "./service.ts";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const supportForms = await SupportService.getAll();
    res.status(200).json(supportForms);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Error fetching support forms." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supportForm = await SupportService.getById(Number(req.params.id));
    res.status(200).json(supportForm);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error fetching support form." });
  }
});

router.post("/", async (req, res) => {
  try {
    const supportForm = await SupportService.create(req.body);
    res.status(201).json(supportForm);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error creating support form." });
  }
});

export default router;
