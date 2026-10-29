/* Vercel runs the invitation's server here (see vercel.json for the routes it
   receives). Vercel serves the built files in dist/ itself. */
import fs from "node:fs/promises";
import path from "node:path";
import { createApp, ROOT } from "../server/app.js";

let shell;
async function getHtml(req) {
  if (shell) return shell;
  try {
    shell = await fs.readFile(path.join(ROOT, "dist", "app.html"), "utf8");
  } catch {
    // not bundled with the function: fetch the built copy Vercel serves
    const res = await fetch(`${req.protocol}://${req.get("host")}/app.html`);
    if (!res.ok) throw new Error(`Could not load app.html (${res.status})`);
    shell = await res.text();
  }
  return shell;
}

export default createApp({ getHtml });
