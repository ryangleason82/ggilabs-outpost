import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const configDirectory = path.join(process.cwd(), "config");
const configPath = path.join(configDirectory, "clients.local.json");

export async function saveClientsConfig() {
  const clients = await prisma.client.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      wpUrl: true,
      wpUsername: true,
      wpAppPassword: true,
      wpResourceRestBase: true,
      wpServiceDetailRestBase: true,
      wpServiceDetailPostType: true,
      gscPropertyUrl: true,
      gscClientId: true,
      gscClientSecret: true,
      gscRefreshToken: true,
      isDefault: true,
    },
  });

  await mkdir(configDirectory, { recursive: true });
  await writeFile(configPath, `${JSON.stringify({ clients }, null, 2)}\n`, "utf8");
}
