import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "subscriptions module root" });
});

export default router;
