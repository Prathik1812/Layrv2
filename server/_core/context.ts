import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ensureDevelopmentPreviewProject, getLocalUserForSession, getUserByOpenId, upsertUser } from "../db";
import { getCookieValue, LOCAL_AUTH_COOKIE, verifyLocalSessionToken } from "../localAuth";
import { isDevelopmentPreviewRequest } from "../previewAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const localSession = await verifyLocalSessionToken(
      getCookieValue(opts.req.headers.cookie, LOCAL_AUTH_COOKIE),
    );
    if (localSession) {
      user = await getLocalUserForSession(localSession.userId, localSession.sessionVersion) ?? null;
    }
  } catch (error) {
    user = null;
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  // Development-only preview identity: lets local preview routes exercise the
  // complete user-scoped workspace while external OAuth is being repaired.
  // This is guarded server-side by NODE_ENV and can never activate in production.
  if (!user && isDevelopmentPreviewRequest(opts.req.headers as Record<string, unknown>)) {
    const openId = "layr-development-preview";
    await upsertUser({ openId, name: "Preview Researcher", email: "preview@local.layr", loginMethod: "development-preview", role: "admin" });
    user = await getUserByOpenId(openId) ?? null;
    if (user) await ensureDevelopmentPreviewProject(user.id);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
