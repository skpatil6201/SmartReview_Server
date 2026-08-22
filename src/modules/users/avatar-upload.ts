import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

/**
 * Where uploaded avatars live on disk, and the URL prefix they are served
 * under. `index.ts` mounts AVATAR_URL_PREFIX -> AVATAR_DIR with express.static.
 */
export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
export const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatars");
export const AVATAR_URL_PREFIX = "/uploads/avatars";

fs.mkdirSync(AVATAR_DIR, { recursive: true });

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/webp": ".webp",
};

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // A fresh random name per upload. The old file is deleted separately, so
    // a replaced photo never reuses a URL an <Image> cache is already holding.
    const id = req.params.id ?? "user";
    const suffix = crypto.randomBytes(8).toString("hex");
    cb(null, `${id}-${suffix}${EXTENSION_BY_MIME[file.mimetype] ?? ".jpg"}`);
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!EXTENSION_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, HEIC or WebP images are allowed."));
    }
    cb(null, true);
  },
});

/** Maps a stored "/uploads/avatars/x.jpg" back to its path on disk. */
export const avatarPathOnDisk = (avatarUrl: string): string | null => {
  const name = path.basename(avatarUrl);
  // Refuse anything that is not a plain filename directly under the prefix —
  // a crafted value must never let us unlink outside AVATAR_DIR.
  if (!avatarUrl.startsWith(`${AVATAR_URL_PREFIX}/`) || name !== avatarUrl.slice(AVATAR_URL_PREFIX.length + 1)) {
    return null;
  }
  return path.join(AVATAR_DIR, name);
};

/** Best-effort cleanup — a missing file must not fail the request. */
export const deleteAvatarFile = async (avatarUrl: string | null) => {
  if (!avatarUrl) return;
  const diskPath = avatarPathOnDisk(avatarUrl);
  if (!diskPath) return;
  await fs.promises.rm(diskPath, { force: true });
};
