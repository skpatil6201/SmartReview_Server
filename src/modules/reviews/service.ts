import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";
import { Review } from "./review.entity.ts";
import { fetchGoogleReviews } from "../google/places.ts";
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

  async replyToReview(reviewId: number, reply: string) {
    if (!reply || !reply.trim()) {
      throw new ServiceError("Reply text is required.", 400);
    }

    const review = await this.reviewRepository.findOneBy({ id: reviewId });
    if (!review) {
      throw new ServiceError("Review not found.", 404);
    }

    review.reply = reply.trim();
    review.replyDate = new Date();
    return this.reviewRepository.save(review);
  }
}

export default new ReviewsService();
