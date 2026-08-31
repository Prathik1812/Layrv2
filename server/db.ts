import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  evidenceAttachments,
  evidenceItems,
  authRateLimits,
  emailVerificationTokens,
  generatedOutputs,
  localCredentials,
  passwordResetTokens,
  projects,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: any = null;

export async function getDb() {
  const url = ENV.databaseUrl || process.env.DATABASE_URL;
  if (!_db && url) {
    try {
      if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
        const client = postgres(url, { prepare: false, ssl: { rejectUnauthorized: false } });
        _db = drizzlePostgres(client);
      } else {
        _db = drizzleMysql(url);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");
  return db;
}

export async function getLocalCredentialByEmail(email: string) {
  const db = await requireDb();
  const result = await db.select({ credential: localCredentials, user: users })
    .from(localCredentials)
    .innerJoin(users, eq(localCredentials.userId, users.id))
    .where(eq(localCredentials.email, email))
    .limit(1);
  return result[0];
}

export async function getLocalCredentialByUserId(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(localCredentials).where(eq(localCredentials.userId, userId)).limit(1);
  return result[0];
}

export async function getLocalUserForSession(userId: number, sessionVersion: number) {
  const db = await requireDb();
  const result = await db.select({ user: users })
    .from(localCredentials)
    .innerJoin(users, eq(localCredentials.userId, users.id))
    .where(and(
      eq(localCredentials.userId, userId),
      eq(localCredentials.sessionVersion, sessionVersion),
      isNotNull(localCredentials.emailVerifiedAt),
    ))
    .limit(1);
  return result[0]?.user;
}

export async function markUserSignedIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function registerFailedSignIn(userId: number, options: { maxFailures: number; failureWindowMs: number; lockoutMs: number }) {
  const db = await requireDb();
  const current = await getLocalCredentialByUserId(userId);
  if (!current) return null;
  const now = new Date();
  const failureWindowStart = new Date(now.getTime() - options.failureWindowMs);
  const failures = current.lastFailedSignInAt && current.lastFailedSignInAt > failureWindowStart
    ? current.failedSignInCount + 1
    : 1;
  const lockedUntil = failures >= options.maxFailures ? new Date(now.getTime() + options.lockoutMs) : null;
  await db.update(localCredentials).set({
    failedSignInCount: failures,
    lastFailedSignInAt: now,
    lockedUntil,
  }).where(eq(localCredentials.userId, userId));
  return { failures, lockedUntil };
}

export async function clearFailedSignIn(userId: number) {
  const db = await requireDb();
  await db.update(localCredentials).set({
    failedSignInCount: 0,
    lastFailedSignInAt: null,
    lockedUntil: null,
  }).where(eq(localCredentials.userId, userId));
}

export async function consumeAuthRateLimit(input: { bucket: string; keyHash: string; limit: number; windowMs: number }) {
  const db = await requireDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - input.windowMs);

  const existing = await db.select().from(authRateLimits)
    .where(and(eq(authRateLimits.bucket, input.bucket), eq(authRateLimits.keyHash, input.keyHash)))
    .limit(1);

  let record = existing[0];
  if (!record) {
    try {
      await db.insert(authRateLimits).values({
        bucket: input.bucket,
        keyHash: input.keyHash,
        windowStartedAt: now,
        attemptCount: 1,
      });
      record = { bucket: input.bucket, keyHash: input.keyHash, windowStartedAt: now, attemptCount: 1 };
    } catch {
      const records = await db.select().from(authRateLimits)
        .where(and(eq(authRateLimits.bucket, input.bucket), eq(authRateLimits.keyHash, input.keyHash)))
        .limit(1);
      record = records[0];
    }
  } else {
    const expired = record.windowStartedAt < windowStart;
    const newCount = expired ? 1 : record.attemptCount + 1;
    const newWindowStartedAt = expired ? now : record.windowStartedAt;
    await db.update(authRateLimits)
      .set({ attemptCount: newCount, windowStartedAt: newWindowStartedAt })
      .where(and(eq(authRateLimits.bucket, input.bucket), eq(authRateLimits.keyHash, input.keyHash)));
    record = { ...record, attemptCount: newCount, windowStartedAt: newWindowStartedAt };
  }

  const retryAfterMs = record && record.attemptCount > input.limit
    ? Math.max(0, input.windowMs - (now.getTime() - record.windowStartedAt.getTime()))
    : 0;
  return { allowed: retryAfterMs === 0, retryAfterMs };
}

export async function createLocalUser(input: { openId: string; email: string; name: string | null; passwordHash: string }) {
  const db = await requireDb();
  const existing = await getLocalCredentialByEmail(input.email);
  if (existing) return null;

  const userResult = await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    email: input.email,
    loginMethod: "email-password",
    role: "user",
    lastSignedIn: new Date(),
  });
  const userId = Number(userResult[0].insertId);
  await db.insert(localCredentials).values({ userId, email: input.email, passwordHash: input.passwordHash });
  return getUserById(userId);
}

export async function createPasswordResetToken(input: { userId: number; tokenHash: string; expiresAt: Date }) {
  const db = await requireDb();
  const now = new Date();
  await db.update(passwordResetTokens).set({ usedAt: now })
    .where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values(input);
}

export async function createEmailVerificationToken(input: { userId: number; tokenHash: string; expiresAt: Date }) {
  const db = await requireDb();
  const now = new Date();
  await db.update(emailVerificationTokens).set({ usedAt: now })
    .where(and(eq(emailVerificationTokens.userId, input.userId), isNull(emailVerificationTokens.usedAt)));
  await db.insert(emailVerificationTokens).values(input);
}

export async function hasActiveEmailVerificationToken(tokenHash: string) {
  const db = await requireDb();
  const result = await db.select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .where(and(
      eq(emailVerificationTokens.tokenHash, tokenHash),
      isNull(emailVerificationTokens.usedAt),
      gt(emailVerificationTokens.expiresAt, new Date()),
    ))
    .limit(1);
  return Boolean(result[0]);
}

export async function verifyEmailWithToken(tokenHash: string) {
  const db = await requireDb();
  const now = new Date();
  const tokenResult = await db.update(emailVerificationTokens).set({ usedAt: now })
    .where(and(
      eq(emailVerificationTokens.tokenHash, tokenHash),
      isNull(emailVerificationTokens.usedAt),
      gt(emailVerificationTokens.expiresAt, now),
    ));
  if (Number(tokenResult[0].affectedRows) !== 1) return null;
  const token = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, tokenHash)).limit(1);
  const userId = token[0]?.userId;
  if (!userId) return null;
  await db.update(localCredentials).set({
    emailVerifiedAt: now,
    sessionVersion: sql`${localCredentials.sessionVersion} + 1`,
    failedSignInCount: 0,
    lastFailedSignInAt: null,
    lockedUntil: null,
  }).where(eq(localCredentials.userId, userId));
  const user = await getUserById(userId);
  const credential = await getLocalCredentialByUserId(userId);
  return user && credential ? { user, sessionVersion: credential.sessionVersion } : null;
}

export async function hasActivePasswordResetToken(tokenHash: string) {
  const db = await requireDb();
  const result = await db.select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ))
    .limit(1);
  return Boolean(result[0]);
}

export async function resetPasswordWithToken(input: { tokenHash: string; passwordHash: string }) {
  const db = await requireDb();
  const now = new Date();
  const tokenResult = await db.update(passwordResetTokens).set({ usedAt: now })
    .where(and(
      eq(passwordResetTokens.tokenHash, input.tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now),
    ));
  if (Number(tokenResult[0].affectedRows) !== 1) return null;

  const token = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, input.tokenHash)).limit(1);
  const userId = token[0]?.userId;
  if (!userId) return null;
  await db.update(localCredentials)
    .set({ passwordHash: input.passwordHash, sessionVersion: sql`${localCredentials.sessionVersion} + 1` })
    .where(eq(localCredentials.userId, userId));
  await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, userId));
  const user = await getUserById(userId);
  const credential = await getLocalCredentialByUserId(userId);
  return user && credential ? { user, sessionVersion: credential.sessionVersion } : null;
}

export async function listProjectsForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
}

export async function getProjectForUser(projectId: number, userId: number) {
  const db = await requireDb();
  const result = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return result[0];
}

export async function createProjectForUser(userId: number, name: string, description?: string) {
  const db = await requireDb();
  const result = await db.insert(projects).values({ userId, name, description: description || null });
  const id = Number(result[0].insertId);
  return getProjectForUser(id, userId);
}

export async function ensureDevelopmentPreviewProject(userId: number) {
  const existing = await listProjectsForUser(userId);
  if (existing[0]) return existing[0];
  return createProjectForUser(userId, "Preview workspace", "A development-only empty workspace for testing the Layr pipeline.");
}

async function requireProjectOwnership(projectId: number, userId: number) {
  const project = await getProjectForUser(projectId, userId);
  if (!project) throw new Error("Project not found or access denied.");
  return project;
}

export async function listEvidenceForProject(projectId: number, userId: number) {
  const db = await requireDb();
  await requireProjectOwnership(projectId, userId);
  const records = await db.select().from(evidenceItems)
    .where(and(eq(evidenceItems.projectId, projectId), eq(evidenceItems.userId, userId)))
    .orderBy(desc(evidenceItems.updatedAt));
  if (!records.length) return [];
  const attachments = await db.select().from(evidenceAttachments)
    .where(and(eq(evidenceAttachments.userId, userId), inArray(evidenceAttachments.evidenceId, records.map(record => record.id))));
  return records.map(record => ({ ...record, attachments: attachments.filter(attachment => attachment.evidenceId === record.id) }));
}

export async function createEvidenceForUser(input: {
  projectId: number; userId: number; title: string; source: string; sourceType: string; rawText: string; tags: string[]; status: string;
}) {
  const db = await requireDb();
  await requireProjectOwnership(input.projectId, input.userId);
  const result = await db.insert(evidenceItems).values(input);
  const id = Number(result[0].insertId);
  const record = await db.select().from(evidenceItems).where(and(eq(evidenceItems.id, id), eq(evidenceItems.userId, input.userId))).limit(1);
  return record[0];
}

async function requireEvidenceOwnership(evidenceId: number, userId: number) {
  const db = await requireDb();
  const record = await db.select().from(evidenceItems)
    .where(and(eq(evidenceItems.id, evidenceId), eq(evidenceItems.userId, userId))).limit(1);
  if (!record[0]) throw new Error("Evidence item not found or access denied.");
  await requireProjectOwnership(record[0].projectId, userId);
  return record[0];
}

export async function getEvidenceForUser(evidenceId: number, userId: number) {
  return requireEvidenceOwnership(evidenceId, userId);
}

export async function updateEvidenceForUser(input: {
  id: number; userId: number; title?: string; source?: string; sourceType?: string; rawText?: string; tags?: string[]; status?: string;
}) {
  const db = await requireDb();
  await requireEvidenceOwnership(input.id, input.userId);
  const { id, userId, ...changes } = input;
  await db.update(evidenceItems).set({ ...changes, updatedAt: new Date() }).where(and(eq(evidenceItems.id, id), eq(evidenceItems.userId, userId)));
  const record = await db.select().from(evidenceItems).where(and(eq(evidenceItems.id, id), eq(evidenceItems.userId, userId))).limit(1);
  return record[0];
}

export async function deleteEvidenceForUser(evidenceId: number, userId: number) {
  const db = await requireDb();
  await requireEvidenceOwnership(evidenceId, userId);
  await db.delete(evidenceItems).where(and(eq(evidenceItems.id, evidenceId), eq(evidenceItems.userId, userId)));
}

export async function addAttachmentForUser(input: {
  evidenceId: number; userId: number; fileName: string; mimeType: string; fileKey: string; fileUrl: string; fileSize: number;
}) {
  const db = await requireDb();
  await requireEvidenceOwnership(input.evidenceId, input.userId);
  const result = await db.insert(evidenceAttachments).values(input);
  const id = Number(result[0].insertId);
  const record = await db.select().from(evidenceAttachments).where(and(eq(evidenceAttachments.id, id), eq(evidenceAttachments.userId, input.userId))).limit(1);
  return record[0];
}

export async function deleteAttachmentForUser(attachmentId: number, userId: number) {
  const db = await requireDb();
  const attachment = await db.select().from(evidenceAttachments)
    .where(and(eq(evidenceAttachments.id, attachmentId), eq(evidenceAttachments.userId, userId))).limit(1);
  if (!attachment[0]) throw new Error("Attachment not found or access denied.");
  await requireEvidenceOwnership(attachment[0].evidenceId, userId);
  await db.delete(evidenceAttachments).where(and(eq(evidenceAttachments.id, attachmentId), eq(evidenceAttachments.userId, userId)));
}

export async function listOutputsForProject(projectId: number, userId: number) {
  const db = await requireDb();
  await requireProjectOwnership(projectId, userId);
  return db.select().from(generatedOutputs).where(and(eq(generatedOutputs.projectId, projectId), eq(generatedOutputs.userId, userId))).orderBy(desc(generatedOutputs.createdAt));
}

export async function createSynthesisForUser(input: { projectId: number; userId: number; title: string; evidenceIds: number[]; content: Record<string, unknown> }) {
  const db = await requireDb();
  await requireProjectOwnership(input.projectId, input.userId);
  const result = await db.insert(generatedOutputs).values({ ...input, outputType: "synthesis" });
  const id = Number(result[0].insertId);
  const output = await db.select().from(generatedOutputs).where(and(eq(generatedOutputs.id, id), eq(generatedOutputs.userId, input.userId))).limit(1);
  return output[0];
}

export async function createWorkflowOutputForUser(input: {
  projectId: number; userId: number; outputType: "flow" | "ship"; title: string; summary: string;
}) {
  const db = await requireDb();
  await requireProjectOwnership(input.projectId, input.userId);
  const result = await db.insert(generatedOutputs).values({
    projectId: input.projectId,
    userId: input.userId,
    outputType: input.outputType,
    title: input.title,
    evidenceIds: [],
    content: { summary: input.summary },
  });
  const id = Number(result[0].insertId);
  const output = await db.select().from(generatedOutputs)
    .where(and(eq(generatedOutputs.id, id), eq(generatedOutputs.userId, input.userId))).limit(1);
  return output[0];
}
