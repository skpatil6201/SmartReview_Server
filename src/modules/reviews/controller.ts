import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "reviews module root" });
});

export default router;
