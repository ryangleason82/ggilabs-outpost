import Image from "next/image";
import Link from "next/link";
import { ClientSelector } from "@/components/ClientSelector";

const nav = [
  { label: "Dashboard", href: "/" },
  { label: "Clients", href: "/clients" },
  { label: "Upload CSV", href: "/upload" },
  { label: "All Articles", href: "/articles" },
  { label: "Publishing Queue", href: "/queue" },
  { label: "Published Library", href: "/library" },
  { label: "How to Use", href: "/how-to" },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-950 p-4 text-white">
      <Link href="/" className="mb-6 block px-2">
        <Image
          src="/LightLogoWhiteBg.png"
          alt="The Outpost"
          width={168}
          height={72}
          priority
          className="h-auto w-full"
        />
      </Link>
      <ClientSelector />
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
