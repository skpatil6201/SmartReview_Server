import { Request, Response } from "express";
import AuthService from "./service.ts";

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

export default { root, signup, login };
