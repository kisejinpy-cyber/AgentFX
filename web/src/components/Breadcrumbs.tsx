import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

export function Breadcrumbs({ items, baseUrl = 'https://meridian-treasury.io' }: BreadcrumbsProps) {
  // Construct the JSON-LD schema
  const schemaList = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": baseUrl,
    },
    ...items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 2,
      "name": item.name,
      ...(item.url ? { item: `${baseUrl}${item.url}` } : {}),
    })),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": schemaList,
  };

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Visual Breadcrumbs */}
      <nav 
        aria-label="Breadcrumb" 
        className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500 font-medium py-3"
      >
        <Link 
          href="/" 
          className="flex items-center gap-1 hover:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1 py-0.5 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="sr-only">Home</span>
        </Link>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
              {item.url && !isLast ? (
                <Link 
                  href={item.url} 
                  className="hover:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1 py-0.5 transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-400 font-semibold select-none px-1 py-0.5" aria-current="page">
                  {item.name}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
