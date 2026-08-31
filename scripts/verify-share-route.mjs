import { eq } from "drizzle-orm";
import { projects, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { appRouter } from "../server/routers.ts";

const db = await getDb();
if (!db) throw new Error("Database connection is unavailable for share verification.");
const project = (await db.select().from(projects).where(eq(projects.id, 1)).limit(1))[0];
const user = project && (await db.select().from(users).where(eq(users.id, project.userId)).limit(1))[0];
if (!project || !user) throw new Error("Project owner is unavailable for share verification.");
const owner = appRouter.createCaller({ user, req: { protocol: "http", headers: {} }, res: {} });
const share = await owner.shares.create({ projectId: project.id, reportScope: "both", expiresInDays: 1 });
const guest = appRouter.createCaller({ user: null, req: { protocol: "http", headers: {} }, res: {} });
const report = await guest.shares.get({ token: share.token });
if (!report.flows.length) throw new Error("Public shared report did not contain generated flows.");
console.log(JSON.stringify({ token: share.token, shareId: share.id, flowCount: report.flows.length, requirementCount: report.requirements.length }));
