import { AppDataSource } from "../../database/data-source.ts";
import { env } from "../../config/env.ts";
import { Business } from "../businesses/business.entity.ts";
import { Review } from "../reviews/review.entity.ts";
import {
  BusinessProfileError,
  GoogleLocation,
  deleteReviewReply,
  listAccounts,
  listLocations,
  listReviews,
  replyToReview as postReplyToGoogle,
} from "./businessProfile.ts";
import {
  GoogleOAuthError,
  buildAuthUrl,
  createOAuthState,
  exchangeCodeForTokens,
  readOAuthState,
  refreshAccessToken,
  revokeToken,
} from "./oauth.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type GoogleConnectionStatus = {
  connectionStatus: Business["googleConnectionStatus"];
  isConnected: boolean;
  googleEmail: string | null;
  accountName: string | null;
  locationName: string | null;
  locationTitle: string | null;
  connectedAt: string | null;
  reviewsSyncedAt: string | null;
  error: string | null;
  /** True when consent is done but the owner still has to pick a location. */
  needsLocationSelection: boolean;
};

export class GoogleService {
  private get businessRepository() {
    return AppDataSource.getRepository(Business);
  }

  private get reviewRepository() {
    return AppDataSource.getRepository(Review);
  }

  private async requireBusiness(businessId: number): Promise<Business> {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new ServiceError("Business not found.", 404);
    }
    return business;
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  /**
   * Step 1. Returns the Google consent URL for this business. The app opens it
   * in a browser; Google redirects back to `handleCallback` when the owner
   * approves.
   */
  async createAuthorizationUrl(businessId: number) {
    if (!env.google.clientId || !env.google.clientSecret) {
      throw new ServiceError(
        "Google Business Profile is not configured on the server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        503,
      );
    }

    const business = await this.requireBusiness(businessId);

    business.googleConnectionStatus = "pending";
    business.googleConnectionError = null;
    await this.businessRepository.save(business);

    const state = createOAuthState(business.id);
    return { authorizationUrl: buildAuthUrl(state), state };
  }

  /**
   * Step 2. Google redirects here with an authorization code. We swap it for
   * tokens, then auto-select the location when the owner manages exactly one -
   * which is the common case and saves them a screen.
   */
  async handleOAuthCallback(code: string, state: string) {
    const businessId = readOAuthState(state);
    const business = await this.requireBusiness(businessId);

    try {
      const tokens = await exchangeCodeForTokens(code);

      business.googleAccessToken = tokens.accessToken;
      // Google only issues a refresh token on first consent - never clobber it.
      if (tokens.refreshToken) business.googleRefreshToken = tokens.refreshToken;
      business.googleTokenExpiresAt = tokens.expiresAt;
      business.googleScope = tokens.scope;
      business.googleConnectionError = null;
      business.googleConnectionStatus = "needs_location";
      await this.businessRepository.save(business);

      const accounts = await listAccounts(tokens.accessToken);
      if (!accounts.length) {
        throw new ServiceError(
          "This Google account does not manage any Business Profile. Sign in with the account that owns your listing.",
          422,
        );
      }

      // Collect locations across every account so a single match auto-connects.
      const found: Array<{ accountName: string; location: GoogleLocation }> = [];
      for (const account of accounts) {
        const locations = await listLocations(tokens.accessToken, account.name);
        for (const location of locations) {
          found.push({ accountName: account.name, location });
        }
      }

      if (found.length === 1) {
        const [only] = found;
        business.googleAccountName = only!.accountName;
        business.googleLocationName = only!.location.name;
        business.googleLocationTitle = only!.location.title;
        business.googleConnectionStatus = "connected";
        business.googleConnectedAt = new Date();
        if (only!.location.placeId) business.googlePlaceId = only!.location.placeId;
      }

      await this.businessRepository.save(business);

      return {
        businessId: business.id,
        connectionStatus: business.googleConnectionStatus,
        locationCount: found.length,
      };
    } catch (error: any) {
      business.googleConnectionStatus = "failed";
      business.googleConnectionError = error?.message ?? "Google connection failed.";
      await this.businessRepository.save(business);
      throw error;
    }
  }

  /** Step 3 (only when several locations exist). */
  async selectLocation(businessId: number, accountName: string, locationName: string) {
    if (!accountName || !locationName) {
      throw new ServiceError("Both accountName and locationName are required.", 400);
    }

    const business = await this.requireBusiness(businessId);
    const accessToken = await this.getAccessToken(business);

    const locations = await listLocations(accessToken, accountName);
    const match = locations.find((location) => location.name === locationName);
    if (!match) {
      throw new ServiceError("That location is not available on the connected Google account.", 404);
    }

    business.googleAccountName = accountName;
    business.googleLocationName = match.name;
    business.googleLocationTitle = match.title;
    business.googleConnectionStatus = "connected";
    business.googleConnectedAt = new Date();
    business.googleConnectionError = null;
    if (match.placeId) business.googlePlaceId = match.placeId;
    await this.businessRepository.save(business);

    return this.toStatus(business);
  }

  async getStatus(businessId: number): Promise<GoogleConnectionStatus> {
    return this.toStatus(await this.requireBusiness(businessId));
  }

  private toStatus(business: Business): GoogleConnectionStatus {
    return {
      connectionStatus: business.googleConnectionStatus,
      isConnected: business.googleConnectionStatus === "connected",
      googleEmail: business.googleEmail,
      accountName: business.googleAccountName,
      locationName: business.googleLocationName,
      locationTitle: business.googleLocationTitle,
      connectedAt: business.googleConnectedAt?.toISOString() ?? null,
      reviewsSyncedAt: business.googleReviewsSyncedAt?.toISOString() ?? null,
      error: business.googleConnectionError,
      needsLocationSelection: business.googleConnectionStatus === "needs_location",
    };
  }

  async disconnect(businessId: number) {
    const business = await this.requireBusiness(businessId);

    if (business.googleRefreshToken) {
      await revokeToken(business.googleRefreshToken);
    }

    business.googleAccessToken = null;
    business.googleRefreshToken = null;
    business.googleTokenExpiresAt = null;
    business.googleScope = null;
    business.googleAccountName = null;
    business.googleLocationName = null;
    business.googleLocationTitle = null;
    business.googleConnectedAt = null;
    business.googleReviewsSyncedAt = null;
    business.googleConnectionError = null;
    business.googleConnectionStatus = "not_started";
    await this.businessRepository.save(business);

    return { message: "Google Business Profile disconnected." };
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  /**
   * A valid access token for this business, refreshing transparently. Access
   * tokens live an hour, so on any realistic usage pattern this refreshes.
   */
  private async getAccessToken(business: Business): Promise<string> {
    if (!business.googleAccessToken && !business.googleRefreshToken) {
      throw new ServiceError(
        "Your Google account is not connected yet. Connect it to load your reviews.",
        409,
      );
    }

    const expiresAt = business.googleTokenExpiresAt?.getTime() ?? 0;
    if (business.googleAccessToken && expiresAt > Date.now()) {
      return business.googleAccessToken;
    }

    if (!business.googleRefreshToken) {
      throw new ServiceError(
        "Your Google session has expired. Please reconnect your Google account.",
        409,
      );
    }

    try {
      const tokens = await refreshAccessToken(business.googleRefreshToken);
      business.googleAccessToken = tokens.accessToken;
      business.googleRefreshToken = tokens.refreshToken ?? business.googleRefreshToken;
      business.googleTokenExpiresAt = tokens.expiresAt;
      await this.businessRepository.save(business);
      return tokens.accessToken;
    } catch (error) {
      business.googleConnectionStatus = "failed";
      business.googleConnectionError =
        "Google revoked access. Please reconnect your Google account.";
      await this.businessRepository.save(business);
      throw new ServiceError(business.googleConnectionError, 409);
    }
  }

  // ── Accounts and locations ────────────────────────────────────────────────

  /** Everything the connected Google user manages, for the location picker. */
  async listAvailableLocations(businessId: number) {
    const business = await this.requireBusiness(businessId);
    const accessToken = await this.getAccessToken(business);

    const accounts = await listAccounts(accessToken);

    const groups = await Promise.all(
      accounts.map(async (account) => ({
        account,
        locations: await listLocations(accessToken, account.name),
      })),
    );

    return {
      selectedAccountName: business.googleAccountName,
      selectedLocationName: business.googleLocationName,
      accounts: groups,
    };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  private requireConnectedLocation(business: Business) {
    if (!business.googleAccountName || !business.googleLocationName) {
      throw new ServiceError(
        "Pick which Google Business location this account manages before loading reviews.",
        409,
      );
    }
    return { accountName: business.googleAccountName, locationName: business.googleLocationName };
  }

  /**
   * Pulls every review from Google and upserts it into `reviews`, keyed by
   * Google's review id so a re-sync updates rather than duplicates. Owner
   * replies already made on Google come back with the review, so they land in
   * the app too.
   */
  async syncReviews(businessId: number) {
    const business = await this.requireBusiness(businessId);
    const { accountName, locationName } = this.requireConnectedLocation(business);
    const accessToken = await this.getAccessToken(business);

    const { reviews, averageRating, totalReviewCount } = await listReviews(
      accessToken,
      accountName,
      locationName,
    );

    let created = 0;
    let updated = 0;

    for (const review of reviews) {
      const existing = await this.reviewRepository.findOneBy({ googleReviewId: review.reviewId });

      const fields = {
        businessId: business.id,
        googleReviewId: review.reviewId,
        googleReviewName: review.name,
        platform: "google",
        authorName: review.reviewer.displayName,
        authorPhotoUrl: review.reviewer.profilePhotoUrl,
        rating: review.starRating,
        comment: review.comment,
        reviewDate: review.createTime ? new Date(review.createTime) : null,
        reply: review.reply?.comment ?? null,
        replyDate: review.reply?.updateTime ? new Date(review.reply.updateTime) : null,
        replySyncedToGoogle: Boolean(review.reply),
      };

      if (existing) {
        Object.assign(existing, fields);
        await this.reviewRepository.save(existing);
        updated += 1;
      } else {
        await this.reviewRepository.save(this.reviewRepository.create(fields));
        created += 1;
      }
    }

    business.googleReviewsSyncedAt = new Date();
    await this.businessRepository.save(business);

    return {
      synced: reviews.length,
      created,
      updated,
      averageRating,
      totalReviewCount: totalReviewCount || reviews.length,
      syncedAt: business.googleReviewsSyncedAt.toISOString(),
    };
  }

  /**
   * Stored Google reviews, newest first. `refresh` forces a live pull; without
   * it we only hit Google when the cache is older than 5 minutes, so opening
   * the reviews tab repeatedly does not burn the daily quota.
   */
  async getReviews(businessId: number, options: { refresh?: boolean } = {}) {
    const business = await this.requireBusiness(businessId);

    const lastSync = business.googleReviewsSyncedAt?.getTime() ?? 0;
    const isStale = Date.now() - lastSync > 5 * 60 * 1000;

    if (business.googleConnectionStatus === "connected" && (options.refresh || isStale)) {
      try {
        await this.syncReviews(businessId);
      } catch (error) {
        // A sync failure should still serve whatever we already stored.
        console.error("Google review sync failed:", error);
      }
    }

    const reviews = await this.reviewRepository.find({
      where: { businessId, platform: "google" },
      order: { reviewDate: "DESC" },
    });

    const rated = reviews.filter((review) => review.rating > 0);
    const averageRating = rated.length
      ? Number((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(2))
      : 0;

    return {
      reviews,
      total: reviews.length,
      averageRating,
      unrepliedCount: reviews.filter((review) => !review.reply).length,
      syncedAt: business.googleReviewsSyncedAt?.toISOString() ?? null,
      locationTitle: business.googleLocationTitle,
      isConnected: business.googleConnectionStatus === "connected",
    };
  }

  /** Writes the reply to Google first - the local row is only the mirror. */
  async replyToReview(businessId: number, reviewId: number, comment: string) {
    if (!comment?.trim()) {
      throw new ServiceError("Reply text is required.", 400);
    }

    const business = await this.requireBusiness(businessId);
    const review = await this.reviewRepository.findOneBy({ id: reviewId });

    if (!review || review.businessId !== business.id) {
      throw new ServiceError("Review not found.", 404);
    }

    if (!review.googleReviewName) {
      throw new ServiceError("This review did not come from Google, so it cannot be replied to there.", 400);
    }

    const accessToken = await this.getAccessToken(business);
    const result = await postReplyToGoogle(accessToken, review.googleReviewName, comment.trim());

    review.reply = result.comment;
    review.replyDate = result.updateTime ? new Date(result.updateTime) : new Date();
    review.replySyncedToGoogle = true;
    await this.reviewRepository.save(review);

    return review;
  }

  async deleteReply(businessId: number, reviewId: number) {
    const business = await this.requireBusiness(businessId);
    const review = await this.reviewRepository.findOneBy({ id: reviewId });

    if (!review || review.businessId !== business.id) {
      throw new ServiceError("Review not found.", 404);
    }

    if (review.googleReviewName) {
      const accessToken = await this.getAccessToken(business);
      await deleteReviewReply(accessToken, review.googleReviewName);
    }

    review.reply = null;
    review.replyDate = null;
    review.replySyncedToGoogle = false;
    await this.reviewRepository.save(review);

    return { message: "Reply removed.", id: review.id };
  }
}

export { BusinessProfileError, GoogleOAuthError, ServiceError as GoogleServiceError };
export default new GoogleService();
