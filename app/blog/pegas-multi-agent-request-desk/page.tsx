import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";
import { MarkdownArticleBody } from "@/components/MarkdownArticleBody";
import { multiAgentRequestDeskArticleMarkdown } from "@/lib/blogContent";

export const metadata: Metadata = {
  title: "From One Model Call to a Multi-Agent System: How Pegas Learned to Route Work | Pegas",
  description:
    "How Pegas turned a self-hosted Qwen3 4B deployment into a visible Request Desk with specialized agents, conditional privacy review, bounded correction loops, and inspectable handoffs.",
};

export default function MultiAgentRequestDeskArticlePage() {
  return (
    <BlogArticle
      title="From One Model Call to a Multi-Agent System: How Pegas Learned to Route Work"
      subtitle="How we turned a self-hosted Qwen3 4B deployment into a visible Request Desk with specialized agents, conditional privacy review, bounded correction loops, and inspectable handoffs."
    >
      <MarkdownArticleBody markdown={multiAgentRequestDeskArticleMarkdown} removeLeadSubtitle />

      <ArticleLinks>
        <ArticleLink href="/blog/pegas-serverless-gpu-modal-scale-to-zero" eyebrow="Previous" title="The Day Pegas Stopped Needing a GPU Babysitter" />
        <ArticleLink href="/blog/pegas-agentic-finance-x402-solana" eyebrow="Next" title="From AI Workflow to Agentic Finance: How Pegas Learned to Pay for Expertise" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live Request Desk" />
        <ArticleLink href="/build" eyebrow="Guide" title="Read how Pegas is built" />
        <ArticleLink href="/benchmark" eyebrow="Archive" title="View the legacy single-step benchmark" />
      </ArticleLinks>
    </BlogArticle>
  );
}
