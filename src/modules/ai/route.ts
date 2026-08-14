import { Router } from "express";
import { generateResponse, root } from "./controller.ts";

const router = Router();

router.get("/", root);
router.post("/generate-response", generateResponse);

export default router;
