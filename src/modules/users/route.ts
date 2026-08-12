import { Router } from "express";
import { getAllUsers, getUser } from "../auth/controller.ts";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id", getUser);

export default router;
