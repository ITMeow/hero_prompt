'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/core/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import NProgress from 'nprogress';
import { PostDetail } from '@/app/[locale]/(landing)/_social-highlights/components/PostDetail';
import { SocialPost } from '@/app/[locale]/(landing)/_social-highlights/lib/types';
import { mapDbPostToSocialPost } from '@/app/[locale]/(landing)/_social-highlights/lib/utils';
import { Loader2 } from 'lucide-react';
import type { Language } from '@/shared/lib/tagTranslator';

export function PostPageClient({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  const urlParams = useParams();
  const router = useRouter();
  const id = urlParams?.id as string;
  const [post, setPost] = useState<SocialPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine current language for data mapping
  const language: Language = locale === 'en' ? 'en' : 'zh-CN';

  useEffect(() => {
    if (id) {
      loadPost(id);
      
      // Increment view count
      fetch('/api/posts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id }),
      }).catch(console.error);
    }
  }, [id]);

  const loadPost = async (postId: string) => {
    try {
      NProgress.start();
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        // Pass language to mapDbPostToSocialPost for proper content extraction
        setPost(mapDbPostToSocialPost(data.post, language));
        setRelatedPosts(data.relatedPosts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language)));
      } else {
        setPost(null);
      }
    } catch (e) {
      console.error(e);
      setPost(null);
    } finally {
      setLoading(false);
      NProgress.done();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] dark:bg-background pt-24 font-[family-name:var(--font-manrope)]">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] dark:bg-background pt-24 font-[family-name:var(--font-manrope)]">
        <p>{t('post_not_found')}</p>
      </div>
    );
  }

  // Post structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': ['CreativeWork', 'WebPage'],
    name: post.title || `Prompt #${post.id}`,
    description: post.description || 'AI prompt from Hero Prompt',
    author: {
      '@type': 'Organization',
      name: 'Hero Prompt',
    },
    publisher: {
      '@type': 'Organization',
      'name': 'Hero Prompt',
      'url': process.env.NEXT_PUBLIC_APP_URL || 'https://hero-prompt.com',
    },
    datePublished: post.createdAt || new Date().toISOString(),
    dateModified: post.updatedAt || post.createdAt || new Date().toISOString(),
    genre: post.tags?.join(', '),
    keywords: post.tags?.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://hero-prompt.com'}/posts/${post.id}`,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: process.env.NEXT_PUBLIC_APP_URL || 'https://hero-prompt.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: post.title || `Prompt #${post.id}`,
          item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hero-prompt.com'}/posts/${post.id}`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PostDetail
        post={post}
        relatedPosts={relatedPosts}
        onBack={() => router.push('/')}
        onPostClick={(p) => router.push(`/posts/${p.id}`)}
      />
    </>
  );
}
