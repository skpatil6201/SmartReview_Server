import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "users module root" });
});

export default router;
