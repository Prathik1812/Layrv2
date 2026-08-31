import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { evidenceRouter, projectsRouter, synthesisRouter, workflowRouter } from "./routers/research";
import { designRouter } from "./routers/design";
import { featuresRouter } from "./routers/features";
import { sharesRouter } from "./routers/shares";
import { localAuthRouter } from "./routers/localAuth";
import { LOCAL_AUTH_COOKIE } from "./localAuth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(LOCAL_AUTH_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  localAuth: localAuthRouter,
  projects: projectsRouter,
  evidence: evidenceRouter,
  synthesis: synthesisRouter,
  workflow: workflowRouter,
  design: designRouter,
  features: featuresRouter,
  shares: sharesRouter,
});

export type AppRouter = typeof appRouter;
