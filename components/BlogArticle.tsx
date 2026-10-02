import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

export function BlogArticle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader active="blog" />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <article className="mx-auto max-w-3xl">
          <Link href="/blog" className="focus-ring inline-flex rounded-lg text-sm font-semibold text-blue-600 hover:text-blue-800">
            ← Back to blog
          </Link>
          <div className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Pegas field notes · October 2026</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl">{title}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 sm:text-xl">{subtitle}</p>
          </div>
          <div className="blog-prose py-8">{children}</div>
        </article>
      </main>
    </div>
  );
}

export function ArticleImage({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption?: string }) {
  return (
    <figure className="my-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full rounded-2xl" />
      {caption ? <figcaption className="px-3 pb-2 pt-3 text-xs leading-5 text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

export function ArticleCallout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside className="my-7 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{label}</p>
      <div className="mt-2 text-sm leading-7 text-slate-800 sm:text-base">{children}</div>
    </aside>
  );
}

export function ArticleLinks({ children }: { children: ReactNode }) {
  return <div className="mt-10 grid gap-3 border-t border-slate-200 pt-7 sm:grid-cols-2">{children}</div>;
}

export function ArticleLink({ href, eyebrow, title }: { href: string; eyebrow: string; title: string }) {
  return (
    <Link href={href} className="focus-ring rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</span>
      <span className="mt-2 block text-base font-semibold leading-6 text-slate-950">{title}</span>
    </Link>
  );
}
