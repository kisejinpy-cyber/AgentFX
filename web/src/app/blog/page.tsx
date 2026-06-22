import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog';
import { BookOpen, Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Protocol Insights Blog | Meridian Treasury OS',
  description: 'Read the latest technical analysis and developer updates on stablecoin gas abstraction, autonomous AI agent escrows, and Circle SDK integrations.',
  keywords: [
    'Meridian blog',
    'stablecoin research',
    'AI agent treasury updates',
    'circle app kit tutorial',
    'B2B web3 payments'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/blog',
  },
  openGraph: {
    title: 'Protocol Insights Blog | Meridian Treasury OS',
    description: 'Read the latest technical analysis and developer updates on stablecoin gas abstraction, autonomous AI agent escrows, and Circle SDK integrations.',
    url: 'https://meridian-treasury.io/blog',
    type: 'website',
  },
};

export default function BlogListPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": "https://meridian-treasury.io/blog/#blog",
        "url": "https://meridian-treasury.io/blog",
        "name": "Meridian Protocol Insights Blog",
        "description": "Developer journals, technology reports, and implementation guides for B2B stablecoin commerce.",
        "publisher": {
          "@type": "Organization",
          "name": "Meridian",
          "logo": "https://meridian-treasury.io/favicon.ico"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://meridian-treasury.io"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Blog",
            "item": "https://meridian-treasury.io/blog"
          }
        ]
      }
    ]
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Breadcrumb System */}
        <Breadcrumbs />

        {/* Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-wider font-semibold">
            <BookOpen className="w-4 h-4" />
            Developer Journals
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-100 leading-tight">
            Protocol Insights & Engineering Updates
          </h1>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            Technical guides, case studies, and protocol explainers for developers building autonomous, compliant B2B stablecoin settlement networks.
          </p>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-900 pt-8">
          {blogPosts.map((post) => (
            <article 
              key={post.slug} 
              className="bg-gray-900/20 border border-gray-800/40 hover:border-cyan-500/20 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                {/* Meta details */}
                <div className="flex flex-wrap gap-3 items-center text-[10px] text-gray-500">
                  <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-semibold uppercase tracking-wider">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{post.publishedDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                {/* Header */}
                <h2 className="text-base font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                {/* Desc */}
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                  {post.description}
                </p>
              </div>

              {/* Action */}
              <div className="pt-6 border-t border-gray-900/50 mt-6 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <User className="w-3.5 h-3.5" />
                  <span>By {post.author}</span>
                </div>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-cyan-400 font-semibold hover:text-cyan-300 group-hover:translate-x-0.5 transition-all"
                >
                  Read Article
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Related Content & Context */}
        <RelatedContent currentSlug="blog" category="Documentation" />

        {/* Global Conversion CTA */}
        <div className="pt-8 border-t border-gray-900">
          <CtaBlock context="marketing" />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
