import { Request, Response } from "express";
import AuthService from "./service.ts";
import BusinessesService from "../businesses/service.ts";
import type { AuthedRequest } from "../../middleware/auth.ts";
import {
  AVATAR_URL_PREFIX,
  deleteAvatarFile,
} from "../users/avatar-upload.ts";

export const root = (_req: Request, res: Response) => {
  res.json({ message: "auth module root" });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.signup(req.body);
    return res.status(201).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return res.json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Internal server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await BusinessesService.getBusinessById(id);
    res.status(200).json(user);
  } catch (error: any) {
    const status = error.message === "Business not found" || error.message === "User not found" ? 404 : 500;
    res.status(status).json({ message: error.message || "Error fetching user" });
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await BusinessesService.getAllBusinesses();
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error fetching users" });
  }
};

/**
 * PUT /api/users/:id — owner-editable profile fields. Guarded by `requireAuth`,
 * so `req.auth` is populated; a business may only edit its own record.
 */
export const updateUser = async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "User id is required" });
    }

    if (!req.auth?.isAdmin && req.auth?.id !== Number(id)) {
      return res.status(403).json({ message: "You can only update your own profile." });
    }

    const user = await BusinessesService.updateBusiness(id, req.body ?? {});
    return res.status(200).json(user);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ message: error?.message || "Error updating user" });
  }
};

/** Rejects unless the caller is this user, or an admin. */
const ownsProfile = (req: AuthedRequest, id: string) =>
  Boolean(req.auth?.isAdmin) || req.auth?.id === Number(id);

export const uploadUserAvatar = async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "User id is required" });
    }

    if (!ownsProfile(req, id)) {
      // Multer has already written the file, so drop it before bailing out.
      await deleteAvatarFile(req.file ? `${AVATAR_URL_PREFIX}/${req.file.filename}` : null);
      return res.status(403).json({ message: "You can only update your own profile." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image was uploaded." });
    }

    const avatarUrl = `${AVATAR_URL_PREFIX}/${req.file.filename}`;
    const { business, previousAvatarUrl } = await BusinessesService.setBusinessAvatar(id, avatarUrl);

    // Only once the new path is committed — otherwise a failed save would
    // leave the record pointing at a file we had already deleted.
    await deleteAvatarFile(previousAvatarUrl);

    return res.status(200).json(business);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ message: error?.message || "Error uploading photo" });
  }
};

export const deleteUserAvatar = async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "User id is required" });
    }

    if (!ownsProfile(req, id)) {
      return res.status(403).json({ message: "You can only update your own profile." });
    }

    const { business, previousAvatarUrl } = await BusinessesService.clearBusinessAvatar(id);
    await deleteAvatarFile(previousAvatarUrl);

    return res.status(200).json(business);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ message: error?.message || "Error removing photo" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.forgotPassword(req.body.email);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error sending OTP." });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.verifyOtp(email, otp);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error verifying OTP." });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const result = await AuthService.resetPassword(email, password, confirmPassword);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error resetting password." });
  }
};

export default { root, signup, login, getUser, updateUser, forgotPassword, verifyOtp, resetPassword };
