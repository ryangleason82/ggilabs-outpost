"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  wpUrl: string;
};

export function ClientSelector() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((json) => {
        setClients(json.clients ?? []);
        setSelectedClientId(json.selectedClientId ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function selectClient(clientId: string) {
    setSelectedClientId(clientId);
    await fetch("/api/clients/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    router.refresh();
  }

  return (
    <div className="mb-3 max-w-xs px-1 min-[761px]:mb-5">
      <label
        htmlFor="client-selector"
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
      >
        Client
      </label>
      <select
        id="client-selector"
        value={selectedClientId}
        disabled={loading || clients.length === 0}
        onChange={(event) => void selectClient(event.target.value)}
        className="w-full rounded-[10px] border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-950 hover:border-zinc-500 disabled:opacity-60"
      >
        {clients.length === 0 ? (
          <option value="">No clients</option>
        ) : (
          clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
