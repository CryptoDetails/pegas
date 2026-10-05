import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function isStructuralLine(line: string) {
  return (
    line.startsWith("## ") ||
    line.startsWith("### ") ||
    line.startsWith("```" ) ||
    line.startsWith("> ") ||
    line.startsWith("- ") ||
    /^\d+\.\s/.test(line) ||
    /^!\[[^\]]*\]\([^)]+\)$/.test(line)
  );
}

function stripFrontmatter(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return lines;

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return end >= 0 ? lines.slice(end + 1) : lines;
}

function prepareBody(markdown: string, removeLeadSubtitle: boolean, stopBeforeHeading?: string) {
  let lines = stripFrontmatter(markdown);

  while (lines.length && !lines[0].trim()) lines = lines.slice(1);

  if (lines[0]?.startsWith("# ")) {
    lines = lines.slice(1);
  }

  while (lines.length && !lines[0].trim()) lines = lines.slice(1);

  if (removeLeadSubtitle && /^\*\*.*\*\*$/.test(lines[0]?.trim() ?? "")) {
    lines = lines.slice(1);
  }

  if (stopBeforeHeading) {
    const stopIndex = lines.findIndex((line) => line.trim() === `## ${stopBeforeHeading}`);
    if (stopIndex >= 0) lines = lines.slice(0, stopIndex);
  }

  return lines;
}

export function MarkdownArticleBody({
  markdown,
  removeLeadSubtitle = false,
  stopBeforeHeading,
  renderImages = true,
}: {
  markdown: string;
  removeLeadSubtitle?: boolean;
  stopBeforeHeading?: string;
  renderImages?: boolean;
}) {
  const lines = prepareBody(markdown, removeLeadSubtitle, stopBeforeHeading);
  const blocks: ReactNode[] = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;

      blocks.push(
        <pre key={`code-${i}`} className="my-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-6 text-slate-100 shadow-sm">
          <code className="border-0 bg-transparent p-0 text-inherit">{code.join("\n")}</code>
          {language ? <span className="sr-only">{language}</span> : null}
        </pre>,
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(<h3 key={`h3-${i}`}>{renderInline(trimmed.slice(4))}</h3>);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(<h2 key={`h2-${i}`}>{renderInline(trimmed.slice(3))}</h2>);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quote.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote key={`quote-${i}`} className="my-7 rounded-r-2xl border-l-4 border-blue-400 bg-blue-50 px-5 py-4 text-slate-800">
          {renderInline(quote.join(" "))}
        </blockquote>,
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc">
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal">
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
        </ol>,
      );
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      i += 1;

      if (!renderImages) {
        while (i < lines.length && !lines[i].trim()) i += 1;
        if (/^\*Proof\s+\d+\./.test(lines[i]?.trim() ?? "")) i += 1;
        continue;
      }

      const [, alt, src] = imageMatch;
      blocks.push(
        <figure key={`img-${i}`} className="my-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-auto w-full rounded-2xl" />
        </figure>,
      );
      continue;
    }

    const paragraph: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || isStructuralLine(next)) break;
      paragraph.push(next);
      i += 1;
    }

    blocks.push(<p key={`p-${i}`}>{renderInline(paragraph.join(" "))}</p>);
  }

  return <>{blocks}</>;
}
