import Link from "next/link";
import { ModelStatus } from "./ModelStatus";
import { siteConfig } from "@/lib/site";

type AppHeaderProps = {
  active: "demo" | "benchmark" | "build";
};

export function AppHeader({ active }: AppHeaderProps) {
  const links = [
    { href: "/", label: "Live proof", id: "demo" as const },
    { href: "/benchmark", label: "Benchmark", id: "benchmark" as const },
    { href: "/build", label: "Build guide", id: "build" as const },
  ];

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:flex-nowrap sm:px-8">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">
            P
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight text-slate-950">Pegas</span>
            <span className="hidden text-xs text-slate-500 sm:block">Open model on your cloud GPU</span>
          </span>
        </Link>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-4">
          <nav className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm sm:w-auto">
            {links.map((link) => (
              <Link
                key={link.id}
                className={`focus-ring flex-1 rounded-lg px-3 py-2 text-center transition sm:flex-none ${
                  active === link.id
                    ? "bg-white font-semibold text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:block">
            {siteConfig.previewMode ? (
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                Preview build
              </span>
            ) : (
              <ModelStatus status="online" compact />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
