import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";
import { MarkdownArticleBody } from "@/components/MarkdownArticleBody";
import { serverlessGpuArticleMarkdown } from "@/lib/blogContent";

export const metadata: Metadata = {
  title: "The Day Pegas Stopped Needing a GPU Babysitter | Pegas",
  description:
    "Moving Pegas from a fragile manually operated GPU workflow to request-driven serverless inference changed the project more than any model upgrade.",
};

export default function ServerlessGpuArticlePage() {
  return (
    <BlogArticle
      title="The Day Pegas Stopped Needing a GPU Babysitter"
      subtitle="Moving Pegas from a fragile manually operated GPU workflow to request-driven serverless inference changed the project more than any model upgrade."
    >
      <MarkdownArticleBody
        markdown={serverlessGpuArticleMarkdown}
        stopBeforeHeading="Proof assets included with this draft"
        renderImages={false}
      />

      <ArticleLinks>
        <ArticleLink href="/blog/why-gpu-hosting-costs-so-much" eyebrow="Previous" title="Why Does Running an Open Model Cost So Much?" />
        <ArticleLink href="/blog/pegas-multi-agent-request-desk" eyebrow="Next" title="From One Model Call to a Multi-Agent System" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live Request Desk" />
        <ArticleLink href="/build" eyebrow="Guide" title="Read the build guide" />
      </ArticleLinks>
    </BlogArticle>
  );
}
