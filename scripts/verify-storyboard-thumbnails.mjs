import { eq } from "drizzle-orm";
import { projects, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { generateStoryboardThumbnails } from "../server/storyboardThumbnails.ts";

const db = await getDb();
if (!db) throw new Error("Database connection is unavailable for thumbnail verification.");
const project = (await db.select().from(projects).where(eq(projects.id, 1)).limit(1))[0];
const user = project && (await db.select().from(users).where(eq(users.id, project.userId)).limit(1))[0];
if (!project || !user) throw new Error("Project owner is unavailable for thumbnail verification.");
const design = await generateStoryboardThumbnails(project.id, user.id);
const ready = design.storyboard.filter(panel => Boolean(panel.thumbnailUrl)).length;
if (!ready) throw new Error("No storyboard thumbnails were generated.");
console.log(JSON.stringify({ panelCount: design.storyboard.length, readyThumbnailCount: ready }));
