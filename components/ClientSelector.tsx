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
    <div className="mb-5 px-2">
      <label
        htmlFor="client-selector"
        className="mb-1 block text-xs font-semibold uppercase text-zinc-500"
      >
        Client
      </label>
      <select
        id="client-selector"
        value={selectedClientId}
        disabled={loading || clients.length === 0}
        onChange={(event) => void selectClient(event.target.value)}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white outline-none hover:border-zinc-500"
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
