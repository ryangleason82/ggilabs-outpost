import Database from "better-sqlite3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const databasePath = path.join(process.cwd(), "dev.db");
const configDirectory = path.join(process.cwd(), "config");
const configPath = path.join(configDirectory, "clients.local.json");
const db = new Database(databasePath, { readonly: true });

const clients = db
  .prepare(`
    SELECT
      id, name, wpUrl, wpUsername, wpAppPassword, wpResourceRestBase,
      wpServiceDetailRestBase, wpServiceDetailPostType,
      gscPropertyUrl, gscClientId, gscClientSecret, gscRefreshToken, isDefault
    FROM Client
    ORDER BY isDefault DESC, name ASC
  `)
  .all()
  .map((client) => ({ ...client, isDefault: Boolean(client.isDefault) }));

db.close();
await mkdir(configDirectory, { recursive: true });
await writeFile(configPath, `${JSON.stringify({ clients }, null, 2)}\n`, "utf8");
console.log(`Saved ${clients.length} client(s) to config/clients.local.json.`);
