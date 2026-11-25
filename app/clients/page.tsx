import { ClientManager } from "@/components/ClientManager";

export default function ClientsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose which WordPress site The Outpost should manage and publish drafts to.
        </p>
      </div>

      <ClientManager />
    </div>
  );
}
