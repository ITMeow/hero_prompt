import { setRequestLocale } from 'next-intl/server';
import LandingClient from './_social-highlights/LandingClient';
import { getPosts } from '@/shared/services/postService';

export const revalidate = 900; // 15 minutes

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
    limit: 30, // Match the client limit
    q: '',
    tags: []
  });

  return <LandingClient initialPosts={initialPosts} initialTotal={initialTotal} />;
}