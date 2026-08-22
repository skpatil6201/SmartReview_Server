import { Router } from "express";
import controller from "./controller.ts";
import { requireAuth } from "../../middleware/auth.ts";

const router = Router();

router.get("/", controller.root);

// Google redirects a browser here, so it carries no app JWT - the signed
// `state` parameter is what identifies the business instead.
router.get("/oauth/callback", controller.oauthCallback);

// Everything below acts on one business's Google tokens, so it needs a session.
router.get("/oauth/url", requireAuth, controller.getAuthorizationUrl);
router.get("/status", requireAuth, controller.getStatus);
router.get("/locations", requireAuth, controller.getLocations);
router.post("/locations/select", requireAuth, controller.selectLocation);

router.get("/reviews", requireAuth, controller.getReviews);
router.post("/reviews/sync", requireAuth, controller.syncReviews);
router.post("/reviews/:reviewId/reply", requireAuth, controller.replyToReview);
router.delete("/reviews/:reviewId/reply", requireAuth, controller.deleteReply);

router.delete("/connection", requireAuth, controller.disconnect);

export default router;
