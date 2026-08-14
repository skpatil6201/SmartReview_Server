import { Router } from "express";
import SubscriptionsService from "./service.ts";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const subscriptions = await SubscriptionsService.getAll();
    res.status(200).json(subscriptions);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Error fetching subscriptions." });
  }
});

router.post("/", async (req, res) => {
  try {
    const subscription = await SubscriptionsService.create(req.body);
    res.status(201).json(subscription);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error creating subscription." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await SubscriptionsService.remove(Number(req.params.id));
    res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error deleting subscription." });
  }
});

router.post("/select", async (req, res) => {
  try {
    const { businessId, subscriptionId } = req.body;
    const result = await SubscriptionsService.selectForBusiness(Number(businessId), Number(subscriptionId));
    res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error selecting subscription." });
  }
});

router.get("/select/:businessId", async (req, res) => {
  try {
    const result = await SubscriptionsService.getForBusiness(Number(req.params.businessId));
    res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || "Error fetching subscription." });
  }
});

export default router;
