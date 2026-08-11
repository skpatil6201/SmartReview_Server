import { Router } from "express";
import { login, signup, root } from "./controller.ts";

const router = Router();

router.get("/", root);
router.post("/signup", signup);
router.post("/login", login);

export default router;
