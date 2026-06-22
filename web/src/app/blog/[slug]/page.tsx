import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts } from '@/lib/blog';
import { Calendar, User, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CtaBlock } from '@/components/ui/CtaBlock';
import { RelatedContent } from '@/components/ui/RelatedContent';
import { Footer } from '@/components/Footer';

interface Props {
  params: Promise<{ slug: string }>;
}

// Generate static params for all blog posts for SSR/SSG caching
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

// Dynamic SEO metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | Meridian Blog',
      description: 'The requested protocol research post could not be found.',
    };
  }

  return {
    title: `${post.title} | Meridian Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `https://meridian-treasury.io/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Meridian Blog`,
      description: post.description,
      url: `https://meridian-treasury.io/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedDate,
      modifiedTime: post.updatedDate,
      authors: [post.author],
      tags: post.keywords,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Meridian Blog`,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const postIndex = blogPosts.findIndex((p) => p.slug === slug);
  const post = blogPosts[postIndex];

  if (!post) {
    notFound();
  }

  // Next / Previous article calculation
  const prevPost = postIndex > 0 ? blogPosts[postIndex - 1] : null;
  const nextPost = postIndex < blogPosts.length - 1 ? blogPosts[postIndex + 1] : null;

  // Filter other posts for related internal linking
  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  // Schema.org Article / BlogPosting structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `https://meridian-treasury.io/blog/${post.slug}/#post`,
        "url": `https://meridian-treasury.io/blog/${post.slug}`,
        "headline": post.title,
        "description": post.description,
        "datePublished": post.publishedDate,
        "dateModified": post.updatedDate,
        "author": {
          "@type": "Person",
          "name": post.author
        },
        "publisher": {
          "@type": "Organization",
          "name": "Meridian",
          "logo": {
            "@type": "ImageObject",
            "url": "https://meridian-treasury.io/favicon.ico"
          }
        },
        "inLanguage": "en-US",
        "mainEntityOfPage": `https://meridian-treasury.io/blog/${post.slug}`
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
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": post.title,
            "item": `https://meridian-treasury.io/blog/${post.slug}`
          }
        ]
      }
    ]
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation Header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        <Header />
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Navigation / Breadcrumb */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-4">
          <Link 
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Articles
          </Link>
          <Breadcrumbs 
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: post.title, href: `/blog/${post.slug}`, isCurrent: true }
            ]} 
          />
        </div>

        {/* Article Metadata Header */}
        <div className="space-y-4">
          <div className="flex gap-3 items-center text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Published: {post.publishedDate}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-100 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Written by <strong className="text-gray-300">{post.author}</strong></span>
            {post.updatedDate !== post.publishedDate && (
              <span className="text-[10px] text-gray-500 italic ml-auto">
                Last updated: {post.updatedDate}
              </span>
            )}
          </div>
        </div>

        {/* Article Body */}
        <article 
          className="prose prose-invert max-w-none text-gray-400 text-sm leading-relaxed space-y-6 pt-6 border-t border-gray-900"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Next / Previous Article Pagination */}
        <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-900 py-6 my-10 text-xs">
          <div>
            {prevPost ? (
              <Link href={`/blog/${prevPost.slug}`} className="block text-left group">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Previous</span>
                <span className="text-gray-300 font-bold group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  {prevPost.title}
                </span>
              </Link>
            ) : (
              <span className="text-gray-600 italic">First article</span>
            )}
          </div>
          <div className="text-right">
            {nextPost ? (
              <Link href={`/blog/${nextPost.slug}`} className="block group">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Next</span>
                <span className="text-gray-300 font-bold group-hover:text-cyan-400 transition-colors flex items-center justify-end gap-1">
                  {nextPost.title}
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ) : (
              <span className="text-gray-600 italic">Latest article</span>
            )}
          </div>
        </div>

        {/* Related Content Recommendations Engine */}
        <RelatedContent currentSlug={post.slug} category={post.category} tags={post.keywords} />

        {/* Dynamic Context Conversion CTA */}
        <div className="pt-4">
          <CtaBlock context="marketing" />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
