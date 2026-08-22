import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "./business.entity.ts";

/**
 * Columns that must never leave the server: password material, the OTP hash,
 * and the Google OAuth tokens. A refresh token in particular is a standing key
 * to the owner's Business Profile, so it stays server-side always.
 */
const SECRET_FIELDS = [
  "passwordHash",
  "passwordSalt",
  "otp",
  "googleAccessToken",
  "googleRefreshToken",
] as const;

export type PublicBusiness = Omit<Business, (typeof SECRET_FIELDS)[number]>;

const sanitize = (business: Business): PublicBusiness => {
  const copy = { ...business } as Record<string, unknown>;
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy as PublicBusiness;
};

export const getBusinessById = async (id: string) => {
  const repo = AppDataSource.getRepository(Business);
  const businessId = Number(id);

  if (Number.isNaN(businessId)) {
    throw new Error("Invalid business id");
  }

  const business = await repo.findOneBy({ id: businessId });
  if (!business) throw new Error("Business not found");
  return sanitize(business);
};

export const getAllBusinesses = async () => {
  const repo = AppDataSource.getRepository(Business);
  const businesses = await repo.find();
  return businesses.map(sanitize);
};

export default { getBusinessById, getAllBusinesses };
