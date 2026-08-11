import { Router } from "express";
import authRouter from "../modules/auth/index.ts";
import usersRouter from "../modules/users/index.ts";
import businessesRouter from "../modules/businesses/index.ts";
import googleRouter from "../modules/google/index.ts";
import reviewsRouter from "../modules/reviews/index.ts";
import aiRouter from "../modules/ai/index.ts";
import subscriptionsRouter from "../modules/subscriptions/index.ts";
import paymentsRouter from "../modules/payments/index.ts";
import notificationsRouter from "../modules/notifications/index.ts";
import productsRouter from "../modules/products/index.ts";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/businesses", businessesRouter);
router.use("/google", googleRouter);
router.use("/reviews", reviewsRouter);
router.use("/ai", aiRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/payments", paymentsRouter);
router.use("/notifications", notificationsRouter);
router.use("/products", productsRouter);

export default router;
