import { Router } from "express";
import { login, signup, root, getUser, getAllUsers } from "./controller.ts";

const router = Router();

router.get("/", root);
router.post("/signup", signup);
router.post("/login", login);
router.get("/user/:id", getUser);
router.get("/users", getAllUsers);

export default router;
