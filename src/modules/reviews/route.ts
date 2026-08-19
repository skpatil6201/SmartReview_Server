import { Router } from "express";
import controller from "./controller.ts";

const router = Router();

router.get("/", controller.root);
router.get("/:businessId", controller.getReviews);
router.post("/", controller.createReview);
router.put("/:id", controller.updateReview);
router.delete("/:id", controller.deleteReview);
router.post("/:reviewId/reply", controller.replyToReview);

export default router;
