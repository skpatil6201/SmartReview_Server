import { Router } from "express";
import controller from "./controller.ts";

const router = Router();

router.get("/", controller.getAllPayments);
router.post("/create-order", controller.createOrder);
router.post("/verify", controller.verifyPayment);
router.get("/business/:businessId", controller.getPaymentsByBusiness);
router.get("/payment/:id", controller.getPaymentById);

export default router;
