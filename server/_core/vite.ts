import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

function getProjectRootDir() {
  const candidates = [
    process.cwd(),
    path.resolve(import.meta.dirname),
    path.resolve(import.meta.dirname, ".."),
    path.resolve(import.meta.dirname, "../.."),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.resolve(dir, "client", "index.html")) || fs.existsSync(path.resolve(dir, "dist", "public", "index.html"))) {
      return dir;
    }
  }
  return process.cwd();
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const rootDir = getProjectRootDir();
      const clientTemplate = path.resolve(rootDir, "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const rootDir = getProjectRootDir();
  const distPath = path.resolve(rootDir, "dist", "public");
  const indexPath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } else {
      res.status(404).send("Build index.html not found.");
    }
  });
}
