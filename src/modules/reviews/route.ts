import { Router } from "express";
import controller from "./controller.ts";

const router = Router();

router.get("/", controller.root);
router.get("/:businessId", controller.getReviews);
router.post("/:reviewId/reply", controller.replyToReview);

export default router;
