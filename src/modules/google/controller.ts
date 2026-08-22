import { Request, Response } from "express";
import GoogleService from "./service.ts";
import { AuthedRequest } from "../../middleware/auth.ts";

const fail = (res: Response, error: any, fallback: string) => {
  const status = error?.statusCode || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

/** Tiny HTML page shown in the browser after Google redirects back. */
const callbackPage = (title: string, message: string, ok: boolean) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin:0; display:grid; place-items:center; min-height:100vh;
             font-family:-apple-system,Segoe UI,Roboto,sans-serif;
             background:#f8fafc; color:#0f172a; }
      .card { max-width:26rem; padding:2rem; border-radius:1rem; background:#fff;
              box-shadow:0 10px 30px rgba(15,23,42,.08); text-align:center; }
      .badge { width:56px; height:56px; margin:0 auto 1rem; border-radius:50%;
               display:grid; place-items:center; font-size:28px;
               background:${ok ? "#dcfce7" : "#fee2e2"}; color:${ok ? "#16a34a" : "#dc2626"}; }
      h1 { font-size:1.15rem; margin:0 0 .5rem; }
      p { margin:0; color:#475569; line-height:1.5; font-size:.95rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">${ok ? "&#10003;" : "!"}</div>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;

export const root = (_req: Request, res: Response) => {
  res.json({ message: "google module root" });
};

/** GET /api/google/oauth/url - the consent URL the app opens in a browser. */
export const getAuthorizationUrl = async (req: AuthedRequest, res: Response) => {
  try {
    const result = await GoogleService.createAuthorizationUrl(req.auth!.id);
    return res.status(200).json(result);
  } catch (error) {
    return fail(res, error, "Unable to start Google authorization.");
  }
};

/**
 * GET /api/google/oauth/callback - Google redirects the browser here.
 * Responds with HTML, not JSON: a human is looking at this page.
 */
export const oauthCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) {
    return res
      .status(400)
      .send(
        callbackPage(
          "Google access was declined",
          "You can close this tab and try again from the app.",
          false,
        ),
      );
  }

  if (!code || !state) {
    return res
      .status(400)
      .send(callbackPage("Something went wrong", "Google did not send an authorization code.", false));
  }

  try {
    const result = await GoogleService.handleOAuthCallback(code, state);

    const message =
      result.connectionStatus === "connected"
        ? "Your Google Business Profile is connected. Return to the app - your reviews are being imported."
        : "Google access granted. Return to the app and choose which business location to connect.";

    return res.status(200).send(callbackPage("All set", message, true));
  } catch (err: any) {
    return res
      .status(err?.statusCode || 500)
      .send(
        callbackPage(
          "Connection failed",
          err?.message || "We could not finish connecting your Google account.",
          false,
        ),
      );
  }
};

/** GET /api/google/status */
export const getStatus = async (req: AuthedRequest, res: Response) => {
  try {
    return res.status(200).json(await GoogleService.getStatus(req.auth!.id));
  } catch (error) {
    return fail(res, error, "Unable to read Google connection status.");
  }
};

/** GET /api/google/locations */
export const getLocations = async (req: AuthedRequest, res: Response) => {
  try {
    return res.status(200).json(await GoogleService.listAvailableLocations(req.auth!.id));
  } catch (error) {
    return fail(res, error, "Unable to load your Google business locations.");
  }
};

/** POST /api/google/locations/select */
export const selectLocation = async (req: AuthedRequest, res: Response) => {
  try {
    const { accountName, locationName } = req.body ?? {};
    const status = await GoogleService.selectLocation(req.auth!.id, accountName, locationName);
    return res.status(200).json(status);
  } catch (error) {
    return fail(res, error, "Unable to select that location.");
  }
};

/** GET /api/google/reviews?refresh=true */
export const getReviews = async (req: AuthedRequest, res: Response) => {
  try {
    const refresh = req.query.refresh === "true" || req.query.refresh === "1";
    return res.status(200).json(await GoogleService.getReviews(req.auth!.id, { refresh }));
  } catch (error) {
    return fail(res, error, "Unable to load Google reviews.");
  }
};

/** POST /api/google/reviews/sync */
export const syncReviews = async (req: AuthedRequest, res: Response) => {
  try {
    return res.status(200).json(await GoogleService.syncReviews(req.auth!.id));
  } catch (error) {
    return fail(res, error, "Unable to sync Google reviews.");
  }
};

/** POST /api/google/reviews/:reviewId/reply */
export const replyToReview = async (req: AuthedRequest, res: Response) => {
  try {
    const review = await GoogleService.replyToReview(
      req.auth!.id,
      Number(req.params.reviewId),
      req.body?.reply ?? req.body?.comment,
    );
    return res.status(200).json(review);
  } catch (error) {
    return fail(res, error, "Unable to publish your reply to Google.");
  }
};

/** DELETE /api/google/reviews/:reviewId/reply */
export const deleteReply = async (req: AuthedRequest, res: Response) => {
  try {
    return res
      .status(200)
      .json(await GoogleService.deleteReply(req.auth!.id, Number(req.params.reviewId)));
  } catch (error) {
    return fail(res, error, "Unable to remove your reply.");
  }
};

/** DELETE /api/google/connection */
export const disconnect = async (req: AuthedRequest, res: Response) => {
  try {
    return res.status(200).json(await GoogleService.disconnect(req.auth!.id));
  } catch (error) {
    return fail(res, error, "Unable to disconnect Google.");
  }
};

export default {
  root,
  getAuthorizationUrl,
  oauthCallback,
  getStatus,
  getLocations,
  selectLocation,
  getReviews,
  syncReviews,
  replyToReview,
  deleteReply,
  disconnect,
};
