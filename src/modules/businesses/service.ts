import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "./business.entity.ts";

export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** Fields the owner is allowed to change from the profile form. */
export type BusinessProfilePatch = {
  businessName?: string;
  ownerName?: string | null;
  email?: string;
  phoneNumber?: string;
  address?: string;
  location?: string | null;
};

const EDITABLE_FIELDS = [
  "businessName",
  "ownerName",
  "email",
  "phoneNumber",
  "address",
  "location",
] as const;

/** Fields that must never leave the server. */
const SENSITIVE_FIELDS = ["passwordHash", "passwordSalt", "otp", "otpExpires"] as const;

export const toPublicBusiness = (business: Business) => {
  const safe = { ...business } as Partial<Business>;
  for (const field of SENSITIVE_FIELDS) delete safe[field];
  return safe;
};

const parseId = (id: string) => {
  const businessId = Number(id);
  if (!id || Number.isNaN(businessId)) {
    throw new ServiceError("Invalid business id", 400);
  }
  return businessId;
};

// Both read paths go out over HTTP, so they are stripped. AuthService does its
// own repository lookups when it needs the real hashes to verify a password.
export const getBusinessById = async (id: string) => {
  const repo = AppDataSource.getRepository(Business);
  const businessId = Number(id);

  if (Number.isNaN(businessId)) {
    throw new Error("Invalid business id");
  }

  const business = await repo.findOneBy({ id: businessId });
  if (!business) throw new Error("Business not found");
  return toPublicBusiness(business);
};

export const getAllBusinesses = async () => {
  const repo = AppDataSource.getRepository(Business);
  const businesses = await repo.find();
  return businesses.map(toPublicBusiness);
};

/**
 * Applies a profile-form patch. Only the fields in `EDITABLE_FIELDS` are ever
 * written, so a caller cannot flip `isAdmin` or overwrite a password hash by
 * padding the request body.
 */
export const updateBusiness = async (id: string, patch: BusinessProfilePatch) => {
  const repo = AppDataSource.getRepository(Business);
  const businessId = parseId(id);

  const business = await repo.findOneBy({ id: businessId });
  if (!business) throw new ServiceError("Business not found", 404);

  for (const field of EDITABLE_FIELDS) {
    const value = patch[field];
    if (value === undefined) continue;

    if (field === "ownerName" || field === "location") {
      // Optional text: an empty string clears the column rather than storing "".
      const trimmed = typeof value === "string" ? value.trim() : "";
      business[field] = trimmed || null;
      continue;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
      throw new ServiceError(`${field} cannot be empty`, 400);
    }
    business[field] = trimmed;
  }

  try {
    await repo.save(business);
  } catch (error: any) {
    // 23505 = unique_violation. businessName and email both carry unique indexes.
    if (error?.code === "23505") {
      const taken = /email/i.test(error?.detail ?? "") ? "email address" : "business name";
      throw new ServiceError(`That ${taken} is already in use.`, 409);
    }
    throw error;
  }

  return toPublicBusiness(business);
};

/**
 * Points the business at a newly uploaded avatar and returns the path of the
 * one it replaced, so the caller can delete that file from disk.
 */
export const setBusinessAvatar = async (id: string, avatarUrl: string) => {
  const repo = AppDataSource.getRepository(Business);
  const business = await repo.findOneBy({ id: parseId(id) });
  if (!business) throw new ServiceError("Business not found", 404);

  const previousAvatarUrl = business.avatarUrl;
  business.avatarUrl = avatarUrl;
  await repo.save(business);

  return { business: toPublicBusiness(business), previousAvatarUrl };
};

/** Clears the avatar, returning the removed path for disk cleanup. */
export const clearBusinessAvatar = async (id: string) => {
  const repo = AppDataSource.getRepository(Business);
  const business = await repo.findOneBy({ id: parseId(id) });
  if (!business) throw new ServiceError("Business not found", 404);

  const previousAvatarUrl = business.avatarUrl;
  business.avatarUrl = null;
  await repo.save(business);

  return { business: toPublicBusiness(business), previousAvatarUrl };
};

export default {
  getBusinessById,
  getAllBusinesses,
  updateBusiness,
  setBusinessAvatar,
  clearBusinessAvatar,
  toPublicBusiness,
};
