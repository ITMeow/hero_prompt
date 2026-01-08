import { setRequestLocale } from 'next-intl/server';
import LandingClient from './_social-highlights/LandingClient';
import { getPosts } from '@/shared/services/postService';
import { getMetadata } from '@/shared/lib/seo';
import Script from 'next/script';

export const revalidate = 0;

// Metadata for SEO and social media
export const generateMetadata = getMetadata({
  metadataKey: 'landing.metadata',
  canonicalUrl: '/',
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch initial posts (SSR)
  const { posts: initialPosts, total: initialTotal } = await getPosts({
    page: 1,
    limit: 50, // Match the client limit
    q: '',
    tags: []
  });

  // Site metadata for service/product structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Hero Prompt - AI Prompt Management Tool',
    description: 'Transform and enhance AI prompts with our powerful prompt editing and management tool. Browse, customize, and share high-quality prompts.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://hero-prompt.com',
    applicationCategory: 'ProductivityApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI prompt management',
      'Variable customization',
      'Multi-language support',
      'Prompt sharing',
    ],
    operatingSystem: 'All',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingClient initialPosts={initialPosts} initialTotal={initialTotal} />
    </>
  );
}