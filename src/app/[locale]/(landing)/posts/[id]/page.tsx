'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PostDetail } from '../../_social-highlights/components/PostDetail';
import { SocialPost } from '../../_social-highlights/lib/types';
import { mapDbPostToSocialPost } from '../../_social-highlights/lib/utils';
import { Loader2 } from 'lucide-react';

export default function PostPage() {
  const t = useTranslations('social.landing');
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [post, setPost] = useState<SocialPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPost(id);
    }
  }, [id]);

  const loadPost = async (postId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(mapDbPostToSocialPost(data.post));
        setRelatedPosts(data.relatedPosts.map(mapDbPostToSocialPost));
      } else {
        setPost(null);
      }
    } catch (e) {
      console.error(e);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] pt-24 font-[family-name:var(--font-manrope)]">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] pt-24 font-[family-name:var(--font-manrope)]">
        <p>{t('post_not_found')}</p>
      </div>
    );
  }

  return (
    <PostDetail 
      post={post}
      relatedPosts={relatedPosts}
      onBack={() => router.push('/')}
      onPostClick={(p) => router.push(`/posts/${p.id}`)}
    />
  );
}
