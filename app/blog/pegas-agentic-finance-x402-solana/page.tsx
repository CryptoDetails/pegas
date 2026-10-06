import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";
import { MarkdownArticleBody } from "@/components/MarkdownArticleBody";
import { agenticFinanceArticleMarkdown } from "@/lib/blogContent";

export const metadata: Metadata = {
  title: "From AI Workflow to Agentic Finance: How Pegas Learned to Pay for Expertise | Pegas",
  description:
    "How Pegas extended a multi-agent workflow with bounded authority, x402 payments on Solana Devnet, independent chain evidence, and a governance model inspired by Lead's agentic finance framework.",
};

export default function AgenticFinanceArticlePage() {
  return (
    <BlogArticle
      title="From AI Workflow to Agentic Finance: How Pegas Learned to Pay for Expertise"
      subtitle="How Pegas extended a multi-agent workflow with bounded authority, x402 payments on Solana Devnet, independent chain evidence, and a governance model inspired by Lead's agentic finance framework."
    >
      <MarkdownArticleBody markdown={agenticFinanceArticleMarkdown} />

      <ArticleLinks>
        <ArticleLink href="/blog/pegas-multi-agent-request-desk" eyebrow="Previous" title="From One Model Call to a Multi-Agent System: How Pegas Learned to Route Work" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live Agentic Finance demo" />
        <ArticleLink href="/build" eyebrow="Guide" title="Read how Pegas is built" />
        <ArticleLink href="/blog" eyebrow="Blog" title="Browse all Pegas field notes" />
      </ArticleLinks>
    </BlogArticle>
  );
}
