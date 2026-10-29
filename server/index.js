/* Runs the invitation on your computer (or any Node host):
     npm run dev   live-reloading while you work
     npm start     the built site (run npm run build first)
   On Vercel, api/index.js runs the same app instead. */
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(ROOT, ".env")); } catch { /* no .env file */ }

// imported after .env is loaded, since the app reads its settings on import
const { createApp, readAccess, store } = await import("./app.js");

const PROD = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;

let getHtml, staticFiles;
if (PROD) {
  staticFiles = express.static(path.join(ROOT, "dist"), { index: false, maxAge: "1d" });
  getHtml = () => fs.readFile(path.join(ROOT, "dist", "app.html"), "utf8");
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "custom" });
  staticFiles = vite.middlewares;
  getHtml = async (req) => vite.transformIndexHtml(req.originalUrl, await fs.readFile(path.join(ROOT, "app.html"), "utf8"));
}

const server = createApp({ getHtml, staticFiles }).listen(PORT, async () => {
  const access = await readAccess();
  console.log(`\n  Invitation  http://localhost:${PORT}/`);
  console.log(`  Portal      http://localhost:${PORT}/admin`);
  console.log(`  Saved in    ${store.where}`);
  console.log(`  Guest lock  ${access.locked ? "ON (password required)" : "off"}`);
  console.log(process.env.ADMIN_PASSWORD
    ? "  Portal is password protected (ADMIN_PASSWORD).\n"
    : "  No ADMIN_PASSWORD set: the portal only accepts edits from this computer.\n");
});
server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.error(`\n  Port ${PORT} is already in use: the invitation server is probably already running.`);
  console.error("  Close the other one, or start on another port, e.g. in PowerShell:  $env:PORT=3001; npm start\n");
  process.exit(1);
});
