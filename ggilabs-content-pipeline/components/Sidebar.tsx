import Link from "next/link";

const nav = [
  { label: "Dashboard", href: "/" },
  { label: "Upload CSV", href: "/upload" },
  { label: "All Articles", href: "/articles" },
  { label: "Publishing Queue", href: "/queue" },
  { label: "Published Library", href: "/library" },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-950 p-4 text-white">
      <div className="mb-6 px-2 text-base font-semibold">GGILabs Content</div>
      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
