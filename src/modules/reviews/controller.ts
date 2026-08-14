import { Request, Response } from "express";
import ReviewsService from "./service.ts";

export const root = (_req: Request, res: Response) => {
  res.json({ message: "reviews module root" });
};

export const getReviews = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const reviews = await ReviewsService.getReviewsForBusiness(Number(businessId));
    return res.status(200).json(reviews);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error fetching reviews." });
  }
};

export const replyToReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const updated = await ReviewsService.replyToReview(Number(reviewId), reply);
    return res.status(200).json(updated);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error saving reply." });
  }
};

export default { root, getReviews, replyToReview };
