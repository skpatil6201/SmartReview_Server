import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  getAllUsers,
  getUser,
  updateUser,
  uploadUserAvatar,
  deleteUserAvatar,
} from "../auth/controller.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { avatarUpload, MAX_AVATAR_BYTES } from "./avatar-upload.ts";

const router = Router();

/**
 * Multer rejects oversized or non-image files by throwing, which would
 * otherwise surface as a generic 500. Turn those into a readable 400 — the
 * app shows this message straight to the user.
 */
const handleUploadErrors = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Image is too large. Please pick one under ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)}MB.`
        : error.message;
    return res.status(400).json({ message });
  }
  if (error instanceof Error) {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
};

router.get("/", getAllUsers);
router.get("/:id", getUser);
// Writes are authenticated — the handler also checks the caller owns this record.
router.put("/:id", requireAuth, updateUser);

// requireAuth runs before multer, so an unauthenticated upload is rejected
// without ever writing the file to disk.
router.post(
  "/:id/avatar",
  requireAuth,
  avatarUpload.single("avatar"),
  handleUploadErrors,
  uploadUserAvatar,
);
router.delete("/:id/avatar", requireAuth, deleteUserAvatar);

export default router;
