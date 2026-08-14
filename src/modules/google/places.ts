import { env } from "../../config/env.ts";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isMatch = (candidate: string, target: string): boolean => {
  const c = normalize(candidate);
  const t = normalize(target);
  if (!t) return false;
  return c.includes(t) || t.includes(c);
};

interface PlacesResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
  }>;
}

interface PlaceReview {
  id?: string;
  text?: { text?: string };
  rating?: number;
  authorAttribution?: { displayName?: string };
  publishTime?: string;
  relativePublishTimeDescription?: string;
}

interface PlaceDetailsResponse {
  reviews?: PlaceReview[];
}

export const findMatchingBusiness = async (
  businessName: string,
  address: string,
): Promise<{ name: string; address: string; placeId: string } | null> => {
  if (!env.googlePlacesApiKey) {
    console.warn("GOOGLE_PLACES_API_KEY is not configured. Skipping Google Maps validation.");
    return null;
  }

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.googlePlacesApiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: `${businessName} ${address}`,
      languageCode: "en",
      maxResultCount: 5,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places API error (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as PlacesResponse;

  for (const place of data.places ?? []) {
    const name = place.displayName?.text ?? "";
    const placeAddress = place.formattedAddress ?? "";
    if (place.id && name && placeAddress && isMatch(name, businessName) && isMatch(placeAddress, address)) {
      return { name, address: placeAddress, placeId: place.id };
    }
  }

  return null;
};

export const fetchGoogleReviews = async (
  placeId: string,
): Promise<PlaceReview[]> => {
  if (!env.googlePlacesApiKey) {
    console.warn("GOOGLE_PLACES_API_KEY is not configured. Skipping Google reviews fetch.");
    return [];
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=reviews`;

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": env.googlePlacesApiKey,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places API error (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  return data.reviews ?? [];
};
