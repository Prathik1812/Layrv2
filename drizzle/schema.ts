import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    currentStage: varchar("currentStage", { length: 32 }).default("evidence").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_user_idx").on(table.userId)],
);

export const evidenceItems = mysqlTable(
  "evidence_items",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 220 }).notNull(),
    source: varchar("source", { length: 220 }).notNull(),
    sourceType: varchar("sourceType", { length: 48 }).notNull(),
    rawText: text("rawText").notNull(),
    tags: json("tags").$type<string[]>().notNull(),
    status: varchar("status", { length: 32 }).default("unreviewed").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("evidence_project_idx").on(table.projectId),
    index("evidence_user_idx").on(table.userId),
  ],
);

export const evidenceAttachments = mysqlTable(
  "evidence_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    evidenceId: int("evidenceId").notNull().references(() => evidenceItems.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
    fileSize: int("fileSize").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("attachments_evidence_idx").on(table.evidenceId),
    index("attachments_user_idx").on(table.userId),
  ],
);

export const generatedOutputs = mysqlTable(
  "generated_outputs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    outputType: varchar("outputType", { length: 48 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    evidenceIds: json("evidenceIds").$type<number[]>().notNull(),
    content: json("content").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("outputs_project_idx").on(table.projectId),
    index("outputs_user_idx").on(table.userId),
  ],
);

export const featureCandidates = mysqlTable(
  "feature_candidates",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 220 }).notNull(),
    rationale: text("rationale").notNull(),
    evidenceIds: json("evidenceIds").$type<number[]>().notNull(),
    selected: int("selected").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("features_project_idx").on(table.projectId), index("features_user_idx").on(table.userId)],
);

export const requirements = mysqlTable(
  "requirements",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    featureId: int("featureId").references(() => featureCandidates.id, { onDelete: "set null" }),
    requirementType: varchar("requirementType", { length: 48 }).notNull(),
    statement: text("statement").notNull(),
    userStory: text("userStory").notNull(),
    acceptanceCriteria: json("acceptanceCriteria").$type<string[]>().notNull(),
    evidenceIds: json("evidenceIds").$type<number[]>().notNull(),
    status: varchar("status", { length: 32 }).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("requirements_project_idx").on(table.projectId), index("requirements_user_idx").on(table.userId)],
);

export const iaNodes = mysqlTable(
  "ia_nodes",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    parentId: int("parentId"),
    label: varchar("label", { length: 220 }).notNull(),
    nodeType: varchar("nodeType", { length: 48 }).notNull(),
    position: json("position").$type<{ x: number; y: number }>().notNull(),
    linkedEvidenceIds: json("linkedEvidenceIds").$type<number[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("ia_nodes_project_idx").on(table.projectId), index("ia_nodes_user_idx").on(table.userId)],
);

export const iaEdges = mysqlTable(
  "ia_edges",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fromNodeId: int("fromNodeId").notNull().references(() => iaNodes.id, { onDelete: "cascade" }),
    toNodeId: int("toNodeId").notNull().references(() => iaNodes.id, { onDelete: "cascade" }),
    edgeType: varchar("edgeType", { length: 48 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ia_edges_project_idx").on(table.projectId), index("ia_edges_user_idx").on(table.userId)],
);

export const flows = mysqlTable(
  "flows",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 220 }).notNull(),
    description: text("description").notNull(),
    linkedEvidenceIds: json("linkedEvidenceIds").$type<number[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("flows_project_idx").on(table.projectId), index("flows_user_idx").on(table.userId)],
);

export const flowNodes = mysqlTable(
  "flow_nodes",
  {
    id: int("id").autoincrement().primaryKey(),
    flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeType: varchar("nodeType", { length: 48 }).notNull(),
    label: varchar("label", { length: 220 }).notNull(),
    trigger: text("trigger").notNull(),
    dataInvolved: text("dataInvolved").notNull(),
    position: json("position").$type<{ x: number; y: number }>().notNull(),
    linkedEvidenceIds: json("linkedEvidenceIds").$type<number[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("flow_nodes_flow_idx").on(table.flowId), index("flow_nodes_user_idx").on(table.userId)],
);

export const flowEdges = mysqlTable(
  "flow_edges",
  {
    id: int("id").autoincrement().primaryKey(),
    flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fromNodeId: int("fromNodeId").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
    toNodeId: int("toNodeId").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
    conditionLabel: varchar("conditionLabel", { length: 220 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("flow_edges_flow_idx").on(table.flowId), index("flow_edges_user_idx").on(table.userId)],
);

export const storyboardPanels = mysqlTable(
  "storyboard_panels",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
    linkedFlowNodeId: int("linkedFlowNodeId").references(() => flowNodes.id, { onDelete: "set null" }),
    orderIndex: int("orderIndex").notNull(),
    caption: text("caption").notNull(),
    linkedEvidenceIds: json("linkedEvidenceIds").$type<number[]>().notNull(),
    thumbnailUrl: varchar("thumbnailUrl", { length: 2048 }),
    thumbnailState: varchar("thumbnailState", { length: 32 }).default("idle").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("storyboard_project_idx").on(table.projectId), index("storyboard_user_idx").on(table.userId)],
);

export const gapFlags = mysqlTable(
  "gap_flags",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    flagType: varchar("flagType", { length: 64 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    whyItMatters: text("whyItMatters").notNull(),
    severity: varchar("severity", { length: 32 }).notNull(),
    linkedEntityType: varchar("linkedEntityType", { length: 64 }).notNull(),
    linkedEntityId: int("linkedEntityId"),
    resolved: int("resolved").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("gap_flags_project_idx").on(table.projectId), index("gap_flags_user_idx").on(table.userId)],
);

export const sharedReports = mysqlTable(
  "shared_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 96 }).notNull().unique(),
    reportScope: varchar("reportScope", { length: 32 }).notNull(),
    expiresAt: timestamp("expiresAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("shared_reports_project_idx").on(table.projectId), index("shared_reports_user_idx").on(table.userId)],
);

export const localCredentials = mysqlTable(
  "local_credentials",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
    sessionVersion: int("sessionVersion").default(1).notNull(),
    emailVerifiedAt: timestamp("emailVerifiedAt"),
    failedSignInCount: int("failedSignInCount").default(0).notNull(),
    lastFailedSignInAt: timestamp("lastFailedSignInAt"),
    lockedUntil: timestamp("lockedUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("local_credentials_user_idx").on(table.userId)],
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("password_reset_user_idx").on(table.userId), index("password_reset_expiry_idx").on(table.expiresAt)],
);

export const emailVerificationTokens = mysqlTable(
  "email_verification_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("verification_token_user_idx").on(table.userId), index("verification_token_expiry_idx").on(table.expiresAt)],
);

export const authRateLimits = mysqlTable(
  "auth_rate_limits",
  {
    id: int("id").autoincrement().primaryKey(),
    bucket: varchar("bucket", { length: 64 }).notNull(),
    keyHash: varchar("keyHash", { length: 128 }).notNull(),
    windowStartedAt: timestamp("windowStartedAt").notNull(),
    attemptCount: int("attemptCount").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique("auth_rate_limit_bucket_key_unique").on(table.bucket, table.keyHash),
    index("auth_rate_limit_window_idx").on(table.windowStartedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type EvidenceAttachment = typeof evidenceAttachments.$inferSelect;
export type GeneratedOutput = typeof generatedOutputs.$inferSelect;
export type FeatureCandidate = typeof featureCandidates.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type IaNode = typeof iaNodes.$inferSelect;
export type IaEdge = typeof iaEdges.$inferSelect;
export type Flow = typeof flows.$inferSelect;
export type FlowNode = typeof flowNodes.$inferSelect;
export type FlowEdge = typeof flowEdges.$inferSelect;
export type StoryboardPanel = typeof storyboardPanels.$inferSelect;
export type GapFlag = typeof gapFlags.$inferSelect;
export type SharedReport = typeof sharedReports.$inferSelect;
export type LocalCredential = typeof localCredentials.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type AuthRateLimit = typeof authRateLimits.$inferSelect;
