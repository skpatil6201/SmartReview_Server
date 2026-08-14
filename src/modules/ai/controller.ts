import { Request, Response } from "express";
import AiService from "./service.ts";

export const root = (_req: Request, res: Response) => {
  res.json({ message: "ai module root" });
};

export const generateResponse = async (req: Request, res: Response) => {
  try {
    const result = await AiService.generateReviewResponse(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({
      message: err?.message || "Error generating AI response.",
    });
  }
};

export default { root, generateResponse };
