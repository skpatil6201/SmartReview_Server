import { Router } from "express";
import controller from "./controller.ts";
import { requireAuth } from "../../middleware/auth.ts";

const router = Router();

router.get("/", controller.root);

// These now reach Google on the caller's behalf - reading a business's reviews
// refreshes them from its Business Profile, and a reply is published to Google
// Maps. Both need a session, so an anonymous caller cannot drive someone
// else's Google account.
router.get("/:businessId", requireAuth, controller.getReviews);
router.post("/", requireAuth, controller.createReview);
router.put("/:id", requireAuth, controller.updateReview);
router.delete("/:id", requireAuth, controller.deleteReview);
router.post("/:reviewId/reply", requireAuth, controller.replyToReview);

export default router;
