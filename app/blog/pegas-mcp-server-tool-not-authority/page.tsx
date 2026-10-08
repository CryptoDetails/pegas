import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";
import { MarkdownArticleBody } from "@/components/MarkdownArticleBody";
import { mcpServerArticleMarkdown } from "@/lib/blogContent";

export const metadata: Metadata = {
  title: "Pegas Became an MCP Server: Other Agents Get a Tool, Not Authority | Pegas",
  description:
    "We opened Pegas to external AI agents through the Model Context Protocol. Claude, Cursor or any MCP client can now ask Pegas to route a request or buy a Legal consultation. The interesting part is not the connection. It is what the caller cannot do.",
};

export default function McpServerArticlePage() {
  return (
    <BlogArticle
      title="Pegas Became an MCP Server: Other Agents Get a Tool, Not Authority"
      subtitle="How Pegas opened itself to external AI agents through the Model Context Protocol, and why the caller gets a tool but never payment authority."
    >
      <MarkdownArticleBody markdown={mcpServerArticleMarkdown} />

      <ArticleLinks>
        <ArticleLink href="/blog/pegas-agentic-finance-x402-solana" eyebrow="Previous" title="From AI Workflow to Agentic Finance: How Pegas Learned to Pay for Expertise" />
        <ArticleLink href="/" eyebrow="Product" title="Try the MCP agent mode on the Demo" />
        <ArticleLink href="/build" eyebrow="Guide" title="Read how Pegas is built" />
        <ArticleLink href="/blog" eyebrow="Blog" title="Browse all Pegas field notes" />
      </ArticleLinks>
    </BlogArticle>
  );
}
