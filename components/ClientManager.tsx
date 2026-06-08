"use client";

import { useEffect, useState } from "react";

type ClientRow = {
  id: string;
  name: string;
  wpUrl: string;
  wpUsername: string;
  wpResourceRestBase: string;
  gscPropertyUrl: string | null;
  gscClientId: string | null;
  isDefault: boolean;
  hasWpAppPassword: boolean;
  hasGscClientSecret: boolean;
  hasGscRefreshToken: boolean;
};

type ClientForm = {
  id?: string;
  name: string;
  wpUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  wpResourceRestBase: string;
  gscPropertyUrl: string;
  gscClientId: string;
  gscClientSecret: string;
  gscRefreshToken: string;
  isDefault: boolean;
};

const emptyForm: ClientForm = {
  name: "",
  wpUrl: "",
  wpUsername: "",
  wpAppPassword: "",
  wpResourceRestBase: "resources",
  gscPropertyUrl: "",
  gscClientId: "",
  gscClientSecret: "",
  gscRefreshToken: "",
  isDefault: false,
};

export function ClientManager() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadClients() {
    const res = await fetch("/api/clients");
    const json = await res.json();
    setClients(json.clients ?? []);
    setSelectedClientId(json.selectedClientId ?? "");
  }

  useEffect(() => {
    let active = true;

    async function loadInitialClients() {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (!active) return;
      setClients(json.clients ?? []);
      setSelectedClientId(json.selectedClientId ?? "");
    }

    void loadInitialClients();

    return () => {
      active = false;
    };
  }, []);

  function editClient(client: ClientRow) {
    setError("");
    setForm({
      id: client.id,
      name: client.name,
      wpUrl: client.wpUrl,
      wpUsername: client.wpUsername,
      wpAppPassword: "",
      wpResourceRestBase: client.wpResourceRestBase,
      gscPropertyUrl: client.gscPropertyUrl ?? "",
      gscClientId: client.gscClientId ?? "",
      gscClientSecret: "",
      gscRefreshToken: "",
      isDefault: client.isDefault,
    });
  }

  async function saveClient() {
    setSaving(true);
    setError("");
    const res = await fetch(form.id ? `/api/clients/${form.id}` : "/api/clients", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? "Client save failed");
      return;
    }

    setForm(emptyForm);
    await loadClients();
  }

  async function makeSelected(clientId: string) {
    await fetch("/api/clients/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    await loadClients();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {clients.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">No clients configured yet.</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  {client.id === selectedClientId && (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  )}
                  {client.isDefault && (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {client.wpUrl} - {client.wpUsername} - REST base{" "}
                  {client.wpResourceRestBase}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  GSC: {client.gscPropertyUrl || "Not configured"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void makeSelected(client.id)}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => editClient(client)}
                  className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold">
          {form.id ? "Edit Client" : "Add Client"}
        </h2>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
              Client name
            </span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
              WordPress URL
            </span>
            <input
              value={form.wpUrl}
              onChange={(event) => setForm({ ...form, wpUrl: event.target.value })}
              placeholder="https://example.com"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
              WordPress username
            </span>
            <input
              value={form.wpUsername}
              onChange={(event) =>
                setForm({ ...form, wpUsername: event.target.value })
              }
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
              Application password
            </span>
            <input
              type="password"
              value={form.wpAppPassword}
              onChange={(event) =>
                setForm({ ...form, wpAppPassword: event.target.value })
              }
              placeholder={form.id ? "Leave blank to keep existing password" : ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
              Resources REST base
            </span>
            <input
              value={form.wpResourceRestBase}
              onChange={(event) =>
                setForm({ ...form, wpResourceRestBase: event.target.value })
              }
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="border-t border-zinc-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold">Google Search Console</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  GSC property URL
                </span>
                <input
                  value={form.gscPropertyUrl}
                  onChange={(event) =>
                    setForm({ ...form, gscPropertyUrl: event.target.value })
                  }
                  placeholder="https://example.com/ or sc-domain:example.com"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  OAuth client ID
                </span>
                <input
                  value={form.gscClientId}
                  onChange={(event) =>
                    setForm({ ...form, gscClientId: event.target.value })
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  OAuth client secret
                </span>
                <input
                  type="password"
                  value={form.gscClientSecret}
                  onChange={(event) =>
                    setForm({ ...form, gscClientSecret: event.target.value })
                  }
                  placeholder={form.id ? "Leave blank to keep existing secret" : ""}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  OAuth refresh token
                </span>
                <input
                  type="password"
                  value={form.gscRefreshToken}
                  onChange={(event) =>
                    setForm({ ...form, gscRefreshToken: event.target.value })
                  }
                  placeholder={form.id ? "Leave blank to keep existing token" : ""}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) =>
                setForm({ ...form, isDefault: event.target.checked })
              }
            />
            Use as default client
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveClient()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Client"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
