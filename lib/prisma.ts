import { PrismaClient } from "@/generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { env } from "cloudflare:workers";
export const prisma = new PrismaClient({ adapter: new PrismaD1((env as unknown as {DB:D1Database}).DB), log:["error"] });
