import { Request, Response } from "express";
import AuthService from "./service.ts";
import BusinessesService from "../businesses/service.ts";

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

/**
 * POST /api/auth/google - body { idToken } from the native Google Sign-In SDK.
 * Returns either a session, or { isNewUser: true, googleProfile } so the app
 * can open the signup form pre-filled.
 */
export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body ?? {};
    const result = await AuthService.googleSignIn(idToken);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Google sign-in failed." });
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

export default {
  root,
  signup,
  login,
  googleSignIn,
  getUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
