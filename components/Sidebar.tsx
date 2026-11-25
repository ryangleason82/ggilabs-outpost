"use client";

import {
  ArrowUpRight, BookOpen, CircleHelp, Download, FileText, Layers, LayoutDashboard,
  Library, ListChecks, Upload, Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientSelector } from "@/components/ClientSelector";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Upload CSV", href: "/upload", icon: Upload },
  { label: "Service Pages", href: "/service-pages", icon: Layers },
  { label: "All Articles", href: "/articles", icon: FileText },
  { label: "Publishing Queue", href: "/queue", icon: ListChecks },
  { label: "Published Library", href: "/library", icon: Library },
  { label: "Prompt Library", href: "/prompts", icon: BookOpen },
  { label: "How to Use", href: "/how-to", icon: CircleHelp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="outpost-sidebar">
      <Link href="/" className="outpost-brand">
        <Image
          src="/darkLogoLightBg.png"
          alt="The Outpost dashboard"
          width={220}
          height={124}
          priority
        />
      </Link>
      <ClientSelector />
      <nav aria-label="Outpost" className="flex shrink-0 gap-1 overflow-x-auto p-1 min-[761px]:flex-col min-[761px]:overflow-visible">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);

          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className="outpost-nav-link">
              <Icon size={16} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
      <a
        href="https://ggilabs-seo-operations.ryangleason.chatgpt.site/"
        target="_blank"
        rel="noopener"
        aria-label="SEO Operations (opens in a new tab)"
        className="outpost-nav-link mx-1 mt-2 shrink-0 justify-between text-sm max-[760px]:self-start"
      >
        SEO Operations
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
      <div className="mt-auto pt-3 min-[761px]:pt-5">
        <a href="/api/backup" className="flex items-center gap-2 border-t border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:text-[var(--accent)]">
          <Download size={14} aria-hidden="true" />
          Export records backup
        </a>
      </div>
    </aside>
  );
}
