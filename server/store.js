/* Where the invitation's data is saved.
   - Upstash Redis when its REST URL/token are set (Vercel adds them when you
     connect an Upstash database to the project). Needed on Vercel, whose
     servers can't keep files.
   - Otherwise JSON files in DATA_DIR (default ./data), for your computer or
     any host with a disk. */
import fs from "node:fs/promises";
import path from "node:path";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PREFIX = "invitation:";

export const storeKind = REDIS_URL && REDIS_TOKEN ? "redis" : process.env.VERCEL ? "none" : "file";

export function dataDir(root) {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
}

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Redis: ${data.error || res.status}`);
  return data.result;
}

export function createStore(root) {
  const dir = dataDir(root);
  const file = (name) => path.join(dir, `${name}.json`);

  if (storeKind === "redis") {
    return {
      where: "Upstash Redis",
      async load(name) {
        const raw = await redis(["GET", PREFIX + name]);
        return raw ? JSON.parse(raw) : null;
      },
      async save(name, data) {
        await redis(["SET", PREFIX + name, JSON.stringify(data)]);
      },
    };
  }

  return {
    where: dir,
    async load(name) {
      try {
        return JSON.parse(await fs.readFile(file(name), "utf8"));
      } catch (err) {
        if (err.code !== "ENOENT") console.error("Could not read", file(name), err.message);
        return null;
      }
    },
    async save(name, data) {
      if (storeKind === "none") {
        throw new Error("No database is connected. In Vercel, add Upstash Redis under Storage and connect it to this project, then redeploy.");
      }
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file(name)}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file(name));
    },
  };
}
