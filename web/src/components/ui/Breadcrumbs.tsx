'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  /** Optional custom breadcrumbs to override automatic generation */
  items?: BreadcrumbItem[];
  /** Optional domain base for absolute URLs in JSON-LD (defaults to https://meridian-treasury.io) */
  domain?: string;
  /** Whether to inject JSON-LD schema into the document */
  injectSchema?: boolean;
}

export function Breadcrumbs({
  items,
  domain = 'https://meridian-treasury.io',
  injectSchema = true,
}: BreadcrumbsProps) {
  const pathname = usePathname();

  // Helper to construct readable titles from path segments
  const formatLabel = (segment: string): string => {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Generate items automatically if not supplied
  const resolvedItems: BreadcrumbItem[] = React.useMemo(() => {
    if (items) return items;
    if (!pathname || pathname === '/') return [];

    const segments = pathname.split('/').filter(Boolean);
    const generated: BreadcrumbItem[] = segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const isCurrent = index === segments.length - 1;
      let label = formatLabel(segment);
      
      // Specialize names for routes
      if (label.toLowerCase() === 'faq') label = 'FAQ';
      if (label.toLowerCase() === 'docs') label = 'Documentation';
      
      return { label, href, isCurrent };
    });

    return [
      { label: 'Home', href: '/' },
      ...generated,
    ];
  }, [items, pathname]);

  if (resolvedItems.length === 0) return null;

  // Schema.org JSON-LD BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': resolvedItems.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.label,
      'item': `${domain}${item.href === '/' ? '' : item.href}`,
    })),
  };

  return (
    <>
      {injectSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center text-[10px] sm:text-xs font-mono uppercase tracking-wider text-gray-500 py-1"
      >
        <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {resolvedItems.map((item, index) => {
            const isLast = index === resolvedItems.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5 sm:gap-2">
                {index > 0 && (
                  <ChevronRight className="w-3 h-3 text-gray-700" aria-hidden="true" />
                )}
                
                {isLast ? (
                  <span
                    aria-current="page"
                    className="text-cyan-400 font-bold max-w-[150px] sm:max-w-xs truncate"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none focus:text-cyan-400"
                  >
                    {index === 0 && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
