import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";
import { Review } from "./review.entity.ts";
import { fetchGoogleReviews } from "../google/places.ts";
import GoogleService from "../google/service.ts";
import { env } from "../../config/env.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ReviewsService {
  private reviewRepository = AppDataSource.getRepository(Review);
  private businessRepository = AppDataSource.getRepository(Business);

  private async syncGoogleReviews(business: Business): Promise<void> {
    // A connected Business Profile is the better source: every review, plus
    // replies. Places API only ever returns five public ones.
    if (business.googleConnectionStatus === "connected" && business.googleLocationName) {
      try {
        await GoogleService.syncReviews(business.id);
        return;
      } catch (error) {
        console.error("Business Profile sync failed, falling back to Places:", error);
      }
    }

    if (!business.googlePlaceId || !env.googlePlacesApiKey) {
      return;
    }

    const googleReviews = await fetchGoogleReviews(business.googlePlaceId);

    for (const gr of googleReviews) {
      if (!gr.id) continue;

      const existing = await this.reviewRepository.findOneBy({
        googleReviewId: gr.id,
      });

      const reviewData = {
        businessId: business.id,
        googleReviewId: gr.id,
        platform: "google",
        authorName: gr.authorAttribution?.displayName ?? null,
        rating: gr.rating ?? 0,
        comment: gr.text?.text ?? "",
        reviewDate: gr.publishTime ? new Date(gr.publishTime) : null,
      };

      if (existing) {
        existing.rating = reviewData.rating;
        existing.comment = reviewData.comment;
        existing.reviewDate = reviewData.reviewDate;
        await this.reviewRepository.save(existing);
      } else {
        await this.reviewRepository.save(
          this.reviewRepository.create(reviewData),
        );
      }
    }
  }

  async getReviewsForBusiness(businessId: number) {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new ServiceError("Business not found.", 404);
    }

    await this.syncGoogleReviews(business);

    return this.reviewRepository.find({
      where: { businessId },
      order: { reviewDate: "DESC" },
    });
  }

  async createReview(data: { businessId: number; authorName?: string; rating: number; comment: string }) {
    const { businessId, authorName, rating, comment } = data;

    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new ServiceError("Business not found.", 404);
    }

    const review = this.reviewRepository.create({
      businessId,
      authorName: authorName ?? null,
      rating,
      comment,
      reviewDate: new Date(),
    });

    return this.reviewRepository.save(review);
  }

  async updateReview(reviewId: number, data: { rating?: number; comment?: string; reply?: string }) {
    const review = await this.reviewRepository.findOneBy({ id: reviewId });
    if (!review) {
      throw new ServiceError("Review not found.", 404);
    }

    if (data.rating !== undefined) review.rating = data.rating;
    if (data.comment !== undefined) review.comment = data.comment;
    if (data.reply !== undefined) {
      review.reply = data.reply.trim() || null;
      review.replyDate = data.reply ? new Date() : null;
    }

    return this.reviewRepository.save(review);
  }

  async deleteReview(reviewId: number) {
    const review = await this.reviewRepository.findOneBy({ id: reviewId });
    if (!review) {
      throw new ServiceError("Review not found.", 404);
    }

    await this.reviewRepository.remove(review);
    return { message: "Review deleted successfully.", id: reviewId };
  }

  async replyToReview(reviewId: number, reply: string) {
    if (!reply || !reply.trim()) {
      throw new ServiceError("Reply text is required.", 400);
    }

    const review = await this.reviewRepository.findOneBy({ id: reviewId });
    if (!review) {
      throw new ServiceError("Review not found.", 404);
    }

    // Reviews that came from a connected Business Profile publish back to
    // Google, so the reply is visible on Maps and not just inside the app.
    if (review.googleReviewName) {
      return GoogleService.replyToReview(review.businessId, review.id, reply);
    }

    review.reply = reply.trim();
    review.replyDate = new Date();
    return this.reviewRepository.save(review);
  }
}

export default new ReviewsService();
