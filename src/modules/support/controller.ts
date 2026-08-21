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

router.get("/user/:email", async (req, res) => {
  try {
    const tickets = await SupportService.getByEmail(req.params.email);
    res.status(200).json(tickets);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Error fetching tickets." });
  }
});

router.get("/business/:businessId", async (req, res) => {
  try {
    const tickets = await SupportService.getByBusinessId(Number(req.params.businessId));
    res.status(200).json(tickets);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Error fetching tickets." });
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

router.put("/:id/reply", async (req, res) => {
  try {
    const { adminReply } = req.body;
    const updated = await SupportService.reply(Number(req.params.id), adminReply);
    res.status(200).json(updated);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error replying to support ticket." });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await SupportService.updateStatus(Number(req.params.id), status);
    res.status(200).json(updated);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error updating status." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await SupportService.delete(Number(req.params.id));
    res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error deleting support ticket." });
  }
});

export default router;
