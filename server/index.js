/* One server for everything:
     /                the invitation (what the main link shows)
     /i/<code>        a share link: wedding only, reception only, or both
     /admin           the portal for editing the details, privacy and links
     /api/invite      GET what a guest may see · PUT to save the content (portal)
   Content is stored in data/invite.json and privacy/links in data/access.json
   (or under $DATA_DIR), so edits go live without rebuilding or redeploying. */
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_ACCESS, DEFAULT_INVITE, mergeInvite, migrateInvite } from "./defaults.js";
import { publicView, VIEWS } from "../src/content/view.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(ROOT, ".env")); } catch { /* no .env file */ }

const PROD = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;
const PASSWORD = process.env.ADMIN_PASSWORD || "";
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "invite.json");
const ACCESS_FILE = path.join(DATA_DIR, "access.json");

/* ---------- storage ---------- */
async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Could not read", file, err.message);
    return null;
  }
}
async function writeJson(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

const readInvite = async () => mergeInvite(migrateInvite(await readJson(DATA_FILE)) || DEFAULT_INVITE);

const newCode = () => crypto.randomBytes(6).toString("base64url");
async function readAccess() {
  const access = mergeInvite(await readJson(ACCESS_FILE), DEFAULT_ACCESS);
  if (!VIEWS[access.plainLink]) access.plainLink = "both";
  let created = false;
  for (const k of Object.keys(access.links)) {
    if (!access.links[k]) { access.links[k] = newCode(); created = true; }
  }
  if (created) await writeJson(ACCESS_FILE, access);
  return access;
}

/* ---------- passwords ---------- */
function makeLimiter() {
  const failures = new Map();   // ip -> { count, until }
  return function check(req, given, want) {
    const f = failures.get(req.ip);
    if (f && f.count >= 8 && Date.now() < f.until) return "locked";
    const a = Buffer.from(String(given || "")), b = Buffer.from(String(want));
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (ok) failures.delete(req.ip);
    else failures.set(req.ip, { count: (f && Date.now() < f.until ? f.count : 0) + 1, until: Date.now() + 10 * 60e3 });
    return ok ? "ok" : "bad";
  };
}
const adminCheck = makeLimiter();
const guestCheck = makeLimiter();
const TOO_MANY = "Too many attempts. Please try again in 10 minutes.";

/* Who may edit. With ADMIN_PASSWORD set: anyone with the password.
   Without it: only a browser on this same computer (http://localhost). */
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const isLocal = (req) =>
  LOCAL_IPS.has(req.socket.remoteAddress) &&
  !req.get("x-forwarded-for") &&
  /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.get("host") || "");

function canEdit(req, res) {
  if (!PASSWORD) {
    if (isLocal(req)) return true;
    res.status(403).json({ error: "Editing is only allowed from this computer. Set ADMIN_PASSWORD to edit from anywhere." });
    return false;
  }
  const r = adminCheck(req, req.get("x-admin-password"), PASSWORD);
  if (r === "ok") return true;
  res.status(r === "locked" ? 429 : 401).json({ error: r === "locked" ? TOO_MANY : "Wrong password." });
  return false;
}

/* What a link shows: a share code picks its view, the main link uses plainLink. */
function viewFor(code, access) {
  if (!code) return access.plainLink;
  return Object.keys(access.links).find((k) => access.links[k] === code) || null;
}

/* ---------- app ---------- */
const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

app.use("/api", (req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-View-Password",
    "Cache-Control": "no-store",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// guests: only what their link allows, and nothing at all while locked without the password
app.get("/api/invite", async (req, res) => {
  const access = await readAccess();
  if (access.locked) {
    const given = Boolean(req.get("x-view-password"));
    // opening the lock screen isn't a wrong guess, so only count real attempts
    const r = given ? guestCheck(req, req.get("x-view-password"), access.password) : "bad";
    if (r !== "ok") {
      return res.status(r === "locked" ? 429 : 401).json({
        locked: true,
        error: r === "locked" ? TOO_MANY : given ? "That password isn't right. Please try again." : "",
      });
    }
  }
  const view = viewFor(String(req.query.link || ""), access);
  if (!view) return res.status(404).json({ error: "This invitation link isn't valid. Please check the link you were sent." });
  const invite = publicView(await readInvite(), view);
  if (!invite.events.length) return res.status(404).json({ error: "This invitation isn't available yet." });
  res.json(invite);
});

app.get("/api/admin/status", (req, res) =>
  res.json({ passwordRequired: Boolean(PASSWORD), localEditing: !PASSWORD && isLocal(req) }));

app.post("/api/admin/login", (req, res) => {
  if (canEdit(req, res)) res.json({ ok: true });
});

app.get("/api/admin/data", async (req, res) => {
  if (!canEdit(req, res)) return;
  res.json({ invite: await readInvite(), access: await readAccess() });
});

app.put("/api/invite", express.json({ limit: "200kb" }), async (req, res) => {
  if (!canEdit(req, res)) return;
  const invite = mergeInvite(migrateInvite(req.body));
  try {
    await writeJson(DATA_FILE, invite);
    console.log(`[${new Date().toISOString()}] invite updated`);
    res.json(invite);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save: " + err.message });
  }
});

app.put("/api/admin/access", express.json({ limit: "20kb" }), async (req, res) => {
  if (!canEdit(req, res)) return;
  const current = await readAccess();
  const body = req.body || {};
  const next = {
    locked: Boolean(body.locked),
    password: String(body.password ?? current.password).trim().slice(0, 100),
    plainLink: VIEWS[body.plainLink] ? body.plainLink : current.plainLink,
    links: body.newLinks
      ? Object.fromEntries(Object.keys(current.links).map((k) => [k, newCode()]))
      : current.links,
  };
  if (next.locked && next.password.length < 4) {
    return res.status(400).json({ error: "Choose a password of at least 4 characters before turning the lock on." });
  }
  try {
    await writeJson(ACCESS_FILE, next);
    console.log(`[${new Date().toISOString()}] access updated (locked: ${next.locked})`);
    res.json(next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save: " + err.message });
  }
});

/* ---------- pages ---------- */
// the link-preview image shows names and date, so hide it while locked
app.get("/assets/preview.jpg", async (_req, res, next) => {
  if ((await readAccess()).locked) return res.sendStatus(404);
  next();
});

let vite;
if (PROD) {
  app.use(express.static(path.join(ROOT, "dist"), { index: false, maxAge: "1d" }));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "custom" });
  app.use(vite.middlewares);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// link previews (WhatsApp etc.) don't run JavaScript, so fill the tags in here
async function withMeta(html, req) {
  const isAdmin = /\/admin\/?$/.test(req.path);
  const access = await readAccess();
  const code = (req.path.match(/^\/i\/([\w-]+)/) || [])[1] || String(req.query.link || "");
  const view = viewFor(code, access);
  let title = "You're invited", desc = "", image = "";
  if (isAdmin) {
    title = "Invitation portal";
  } else if (!access.locked && view) {
    const invite = publicView(await readInvite(), view);
    if (invite.events.length) {
      title = invite.share.title;
      desc = invite.share.description;
      // the main preview shows the wedding date, so reception-only links get the Ganesha card
      const file = invite.events[0].key === "wedding" ? "preview.jpg" : "preview-ganesha.jpg";
      image = `${req.protocol}://${req.get("host")}/assets/${file}`;
    }
  }
  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`);
  html = image
    ? html.replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(image)}`)
    : html.replace(/\s*<meta property="og:image"[^>]*>/, "");
  if (isAdmin || access.locked) html = html.replace("</head>", `  <meta name="robots" content="noindex">\n</head>`);
  return html;
}

app.get("*", async (req, res, next) => {
  if (req.path.startsWith("/api/") || path.extname(req.path)) return next();
  try {
    let html;
    if (PROD) html = await fs.readFile(path.join(ROOT, "dist", "index.html"), "utf8");
    else html = await vite.transformIndexHtml(req.originalUrl, await fs.readFile(path.join(ROOT, "index.html"), "utf8"));
    res.set("Cache-Control", "no-cache").type("html").send(await withMeta(html, req));
  } catch (err) {
    if (vite) vite.ssrFixStacktrace(err);
    next(err);
  }
});

const server = app.listen(PORT, async () => {
  const access = await readAccess();
  console.log(`\n  Invitation  http://localhost:${PORT}/`);
  console.log(`  Portal      http://localhost:${PORT}/admin`);
  console.log(`  Content     ${DATA_DIR}`);
  console.log(`  Guest lock  ${access.locked ? "ON (password required)" : "off"}`);
  console.log(PASSWORD
    ? "  Portal is password protected (ADMIN_PASSWORD).\n"
    : "  No ADMIN_PASSWORD set: the portal only accepts edits from this computer.\n");
});
server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.error(`\n  Port ${PORT} is already in use: the invitation server is probably already running.`);
  console.error("  Close the other one, or start on another port, e.g. in PowerShell:  $env:PORT=3001; npm start\n");
  process.exit(1);
});
