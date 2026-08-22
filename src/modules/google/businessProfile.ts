/**
 * Thin client for the Google Business Profile APIs.
 *
 * Google split these across three hosts, which is why the base URLs differ:
 *   - accounts        -> mybusinessaccountmanagement.googleapis.com/v1
 *   - locations       -> mybusinessbusinessinformation.googleapis.com/v1
 *   - reviews/replies -> mybusiness.googleapis.com/v4   (still the only version
 *                        that exposes reviews)
 *
 * Reviews here are the real, complete set for the location - not the five
 * public ones the Places API returns - and replies written through this client
 * appear on Google Maps.
 */

const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFORMATION_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";

export class BusinessProfileError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type GoogleAccount = {
  /** "accounts/1234567890" */
  name: string;
  accountName: string;
  type: string | null;
  verificationState: string | null;
};

export type GoogleLocation = {
  /** "locations/987654321" */
  name: string;
  title: string;
  address: string | null;
  phone: string | null;
  mapsUri: string | null;
  placeId: string | null;
};

export type GoogleReview = {
  /** "accounts/{a}/locations/{l}/reviews/{r}" */
  name: string;
  reviewId: string;
  reviewer: { displayName: string | null; profilePhotoUrl: string | null };
  starRating: number;
  comment: string;
  createTime: string | null;
  updateTime: string | null;
  reply: { comment: string; updateTime: string | null } | null;
};

/** Google sends star ratings as words, and ONE..FIVE is the full set. */
const STAR_RATINGS: Record<string, number> = {
  STAR_RATING_UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const toStars = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return STAR_RATINGS[value] ?? 0;
  return 0;
};

const request = async <T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new BusinessProfileError(
        "Google denied access to your Business Profile. Reconnect your Google account and make sure it manages this business.",
        403,
      );
    }

    if (response.status === 429) {
      throw new BusinessProfileError(
        "The Google Business Profile quota is exhausted. Try again shortly, or request more quota in Google Cloud Console.",
        429,
      );
    }

    throw new BusinessProfileError(
      `Google Business Profile API error (${response.status}): ${detail.slice(0, 400)}`,
    );
  }

  return (await response.json()) as T;
};

/** Every GBP account the signed-in Google user can manage. */
export const listAccounts = async (accessToken: string): Promise<GoogleAccount[]> => {
  const accounts: GoogleAccount[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${ACCOUNTS_API}/accounts`);
    url.searchParams.set("pageSize", "20");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const data = await request<{
      accounts?: Array<{
        name?: string;
        accountName?: string;
        type?: string;
        verificationState?: string;
      }>;
      nextPageToken?: string;
    }>(url.toString(), accessToken);

    for (const account of data.accounts ?? []) {
      if (!account.name) continue;
      accounts.push({
        name: account.name,
        accountName: account.accountName ?? account.name,
        type: account.type ?? null,
        verificationState: account.verificationState ?? null,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return accounts;
};

/** Locations (individual storefronts) under one account. */
export const listLocations = async (
  accessToken: string,
  accountName: string,
): Promise<GoogleLocation[]> => {
  const locations: GoogleLocation[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${INFORMATION_API}/${accountName}/locations`);
    // readMask is mandatory on this endpoint - omitting it is a 400.
    url.searchParams.set("readMask", "name,title,storefrontAddress,phoneNumbers,metadata");
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const data = await request<{
      locations?: Array<{
        name?: string;
        title?: string;
        storefrontAddress?: { addressLines?: string[]; locality?: string; postalCode?: string };
        phoneNumbers?: { primaryPhone?: string };
        metadata?: { mapsUri?: string; placeId?: string };
      }>;
      nextPageToken?: string;
    }>(url.toString(), accessToken);

    for (const location of data.locations ?? []) {
      if (!location.name) continue;

      const address = [
        ...(location.storefrontAddress?.addressLines ?? []),
        location.storefrontAddress?.locality,
        location.storefrontAddress?.postalCode,
      ]
        .filter(Boolean)
        .join(", ");

      locations.push({
        name: location.name,
        title: location.title ?? location.name,
        address: address || null,
        phone: location.phoneNumbers?.primaryPhone ?? null,
        mapsUri: location.metadata?.mapsUri ?? null,
        placeId: location.metadata?.placeId ?? null,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return locations;
};

/** `locations/123` -> `123`; the v4 reviews path wants the bare id. */
const locationId = (locationName: string): string =>
  locationName.startsWith("locations/") ? locationName.slice("locations/".length) : locationName;

export const reviewResourceName = (
  accountName: string,
  locationName: string,
  reviewId: string,
): string => `${accountName}/locations/${locationId(locationName)}/reviews/${reviewId}`;

/**
 * Every review for a location, following pagination to the end. Google returns
 * 50 per page at most, so a busy location costs several round trips.
 */
export const listReviews = async (
  accessToken: string,
  accountName: string,
  locationName: string,
): Promise<{ reviews: GoogleReview[]; averageRating: number | null; totalReviewCount: number }> => {
  const reviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  let averageRating: number | null = null;
  let totalReviewCount = 0;

  do {
    const url = new URL(
      `${REVIEWS_API}/${accountName}/locations/${locationId(locationName)}/reviews`,
    );
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const data = await request<{
      reviews?: Array<{
        name?: string;
        reviewId?: string;
        reviewer?: { displayName?: string; profilePhotoUrl?: string };
        starRating?: string | number;
        comment?: string;
        createTime?: string;
        updateTime?: string;
        reviewReply?: { comment?: string; updateTime?: string };
      }>;
      averageRating?: number;
      totalReviewCount?: number;
      nextPageToken?: string;
    }>(url.toString(), accessToken);

    if (typeof data.averageRating === "number") averageRating = data.averageRating;
    if (typeof data.totalReviewCount === "number") totalReviewCount = data.totalReviewCount;

    for (const review of data.reviews ?? []) {
      const id = review.reviewId ?? review.name?.split("/").pop();
      if (!id) continue;

      reviews.push({
        name: review.name ?? reviewResourceName(accountName, locationName, id),
        reviewId: id,
        reviewer: {
          displayName: review.reviewer?.displayName ?? null,
          profilePhotoUrl: review.reviewer?.profilePhotoUrl ?? null,
        },
        starRating: toStars(review.starRating),
        comment: review.comment ?? "",
        createTime: review.createTime ?? null,
        updateTime: review.updateTime ?? null,
        reply: review.reviewReply?.comment
          ? {
              comment: review.reviewReply.comment,
              updateTime: review.reviewReply.updateTime ?? null,
            }
          : null,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { reviews, averageRating, totalReviewCount };
};

/** Publishes (or overwrites) the owner reply shown under the review on Maps. */
export const replyToReview = async (
  accessToken: string,
  reviewName: string,
  comment: string,
): Promise<{ comment: string; updateTime: string | null }> => {
  const data = await request<{ comment?: string; updateTime?: string }>(
    `${REVIEWS_API}/${reviewName}/reply`,
    accessToken,
    { method: "PUT", body: JSON.stringify({ comment }) },
  );

  return { comment: data.comment ?? comment, updateTime: data.updateTime ?? null };
};

export const deleteReviewReply = async (accessToken: string, reviewName: string): Promise<void> => {
  await request(`${REVIEWS_API}/${reviewName}/reply`, accessToken, { method: "DELETE" });
};
