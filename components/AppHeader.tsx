import Image from "next/image";
import Link from "next/link";

type AppHeaderProps = { active: "demo" | "vision" | "benchmark" | "build" | "blog" };

export function AppHeader({ active }: AppHeaderProps) {
  const links = [
    { href: "/", label: "Demo", id: "demo" as const },
    { href: "/vision", label: "Vision", id: "vision" as const },
    { href: "/build", label: "Guide", id: "build" as const },
    { href: "/blog", label: "Blog", id: "blog" as const },
  ];

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:flex-nowrap sm:px-8">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl">
          <Image src="/brand/pegas-logo.png" alt="Pegas logo" width={40} height={40} className="h-10 w-10 rounded-xl object-contain" priority />
          <span>
            <span className="block text-sm font-semibold tracking-tight text-slate-950">Pegas</span>
            <span className="hidden text-xs text-slate-500 sm:block">Agentic Finance prototype</span>
          </span>
        </Link>
        <nav className="flex w-full items-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm sm:w-auto">
          {links.map((link) => (
            <Link
              key={link.id}
              className={`focus-ring flex-none rounded-lg px-3 py-2 text-center transition ${active === link.id ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
