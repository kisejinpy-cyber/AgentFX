import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Developer Support',
  description: 'Reach out to the Meridian core team for support on smart contracts integrations, Circle developer wallet sets, and stablecoin payment inquiries.',
  keywords: [
    'contact Meridian',
    'developer support stablecoin',
    'b2b payment query',
    'wallet integration assistance'
  ],
  alternates: {
    canonical: 'https://meridian-treasury.io/contact',
  },
  openGraph: {
    title: 'Contact Developer Support',
    description: 'Reach out to the Meridian core team for support on smart contracts integrations, Circle developer wallet sets, and stablecoin payment inquiries.',
    url: 'https://meridian-treasury.io/contact',
    type: 'website',
  },
};

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": "https://meridian-treasury.io/contact/#webpage",
        "url": "https://meridian-treasury.io/contact",
        "name": "Contact support team - Meridian",
        "description": "Reach out to Meridian B2B Stablecoin OS core developer group for code, key settings, and integration support.",
        "breadcrumb": {
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
              "name": "Contact",
              "item": "https://meridian-treasury.io/contact"
            }
          ]
        }
      },
      {
        "@type": "Organization",
        "name": "Meridian",
        "url": "https://meridian-treasury.io",
        "logo": "https://meridian-treasury.io/favicon.ico",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "support@meridian-treasury.io",
          "contactType": "technical support",
          "availableLanguage": "English"
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactClient />
    </>
  );
}
