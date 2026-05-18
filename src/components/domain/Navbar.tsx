"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CommandSearch } from "@/components/domain/CommandSearch";
import { ThemeToggle } from "@/components/domain/ThemeToggle";

const links = [
  { href: "/models", label: "Directory" },
  { href: "/compare", label: "Compare" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-6">
        <Link href="/" className="text-lg font-bold tracking-tight font-heading">
          ModelIndex
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          <CommandSearch />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
