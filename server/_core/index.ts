import "dotenv/config";
if (import.meta.url.includes("dist")) {
  process.env.NODE_ENV = "production";
} else {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
}
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("[Layr] Initializing Express server...");
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const preferredPort = parseInt(process.env.PORT || "5000");
  const port = await findAvailablePort(preferredPort);

  if (process.env.NODE_ENV === "development") {
    console.log("[Layr] Configuring Vite middleware for dev mode...");
    await setupVite(app, server);
    console.log("[Layr] Vite middleware ready.");
  } else {
    serveStatic(app);
  }

  // Global Error Handler for Express
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Layr Error Handler]:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n==================================================`);
    console.log(`  LAYR SAAS PLATFORM IS RUNNING AT:`);
    console.log(`  http://localhost:${port}/`);
    console.log(`  http://127.0.0.1:${port}/`);
    console.log(`==================================================\n`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("[Layr] Startup Error:", err);
  });
}

