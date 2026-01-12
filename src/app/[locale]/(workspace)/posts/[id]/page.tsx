import { setRequestLocale } from 'next-intl/server';
import { getMetadata } from '@/shared/lib/seo';
import { PostPageClient } from './PostPageClient';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { eq, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { mapDbPostToSocialPost } from '@/app/[locale]/(landing)/_social-highlights/lib/utils';
import type { Language } from '@/shared/lib/tagTranslator';

// 1. Generate Static Params for the top 50 newest posts
// This ensures these pages are pre-built at deployment time (SSG)
export async function generateStaticParams() {
  try {
    const posts = await db()
      .select({ id: landingPost.id })
      .from(landingPost)
      .orderBy(desc(landingPost.createdAt))
      .limit(50);
    
    return posts.map((post) => ({
      id: post.id,
    }));
  } catch (e) {
    console.error('Error generating static params:', e);
    return [];
  }
}

// 2. Cached Data Fetching Function
// Uses Next.js unstable_cache to cache the DB result indefinitely
// untill revalidateTag is called.
const getCachedPost = async (id: string) => {
  const fetchPost = unstable_cache(
    async () => {
      const result = await db()
        .select()
        .from(landingPost)
        .where(eq(landingPost.id, id));
      return result[0] || null;
    },
    [`post-${id}`], // Unique cache key part
    { 
      tags: ['posts', `post-${id}`], // Tags for invalidation
      revalidate: false // Cache indefinitely until manually invalidated
    }
  );

  return fetchPost();
};

// Generate dynamic metadata for each post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  
  // Try to fetch from cache for metadata to be fast
  const post = await getCachedPost(id);
  
  // Fallback metadata if post not found
  if (!post) {
    return {
      title: 'Post Not Found - Hero Prompt',
    };
  }

  // Extract localized title/desc
  const socialPost = mapDbPostToSocialPost(post, locale === 'zh-CN' ? 'zh-CN' : 'en');

  const metadataGenerator = getMetadata({
    title: socialPost.title || `Prompt #${id} - Hero Prompt`,
    description: socialPost.description || `View and customize AI prompt #${id} on Hero Prompt`,
    canonicalUrl: `/posts/${id}`,
    imageUrl: socialPost.imageUrl
  });
  return metadataGenerator({ params: Promise.resolve({ locale }) });
}

// Server Component Wrapper
async function PostPageContent({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 3. Fetch data Server-Side
  // This will hit the cache (Redis/Data Cache) first.
  const dbPost = await getCachedPost(id);
  
  let initialPost = null;
  if (dbPost) {
    initialPost = mapDbPostToSocialPost(dbPost, locale === 'zh-CN' ? 'zh-CN' : 'en');
  }

  // We pass the pre-fetched data to the client component.
  // The client component will skip the loading spinner and render instantly.
  return <PostPageClient params={params} initialPost={initialPost} />;
}

// Export the server component as default
export default PostPageContent;
