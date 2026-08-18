import { Router } from "express";
import { login, signup, root, getUser, getAllUsers, forgotPassword, verifyOtp, resetPassword } from "./controller.ts";

const router = Router();

router.get("/", root);
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.get("/user/:id", getUser);
router.get("/users", getAllUsers);

export default router;
