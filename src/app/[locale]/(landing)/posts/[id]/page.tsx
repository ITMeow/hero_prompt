'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PostDetail } from '../../_social-highlights/components/PostDetail';
import { getPostById, getAllPosts } from '../../_social-highlights/lib/db';
import { SocialPost } from '../../_social-highlights/lib/types';
import { Loader2 } from 'lucide-react';

export default function PostPage() {
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
    setLoading(true);
    try {
      const p = await getPostById(postId);
      if (p) {
        setPost(p);
        // Load related posts (simple mock: just take first 3 other posts)
        const all = await getAllPosts();
        setRelatedPosts(all.filter(x => x.id !== postId).slice(0, 3));
      } else {
         // Handle not found
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] pt-24 font-[family-name:var(--font-manrope)]">
        <Loader2 className="animate-spin w-10 h-10 text-gray-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] pt-24 font-[family-name:var(--font-manrope)]">
        <p>Post not found</p>
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
