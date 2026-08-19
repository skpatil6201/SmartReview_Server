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

export const createReview = async (req: Request, res: Response) => {
  try {
    const { businessId, authorName, rating, comment } = req.body;
    const review = await ReviewsService.createReview({ businessId, authorName, rating, comment });
    return res.status(201).json(review);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error creating review." });
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, reply } = req.body;
    const updated = await ReviewsService.updateReview(Number(id), { rating, comment, reply });
    return res.status(200).json(updated);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error updating review." });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ReviewsService.deleteReview(Number(id));
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error deleting review." });
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

export default { root, getReviews, createReview, updateReview, deleteReview, replyToReview };
