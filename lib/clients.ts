import { cookies } from "next/headers";
import type { Client } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SELECTED_CLIENT_COOKIE = "outpost_client_id";

export type ClientSummary = Pick<
  Client,
  "id" | "name" | "wpUrl" | "wpUsername" | "wpResourceRestBase" | "isDefault"
>;

export async function getClients(): Promise<ClientSummary[]> {
  return prisma.client.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      wpUrl: true,
      wpUsername: true,
      wpResourceRestBase: true,
      isDefault: true,
    },
  });
}

export async function getSelectedClientId() {
  const cookieStore = await cookies();
  const cookieClientId = cookieStore.get(SELECTED_CLIENT_COOKIE)?.value;

  if (cookieClientId) {
    const exists = await prisma.client.findUnique({
      where: { id: cookieClientId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  const fallback = await prisma.client.findFirst({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  return fallback?.id ?? null;
}

export async function getSelectedClient() {
  const selectedClientId = await getSelectedClientId();
  if (!selectedClientId) return null;

  return prisma.client.findUnique({
    where: { id: selectedClientId },
  });
}

export async function selectedClientWhere() {
  const clientId = await getSelectedClientId();
  return clientId ? { clientId } : {};
}
