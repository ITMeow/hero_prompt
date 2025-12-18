'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { PostCard } from './components/PostCard';
import { Header } from './components/Header';
import { SocialPost } from './lib/types';
import { mapDbPostToSocialPost } from './lib/utils';

export default function LandingClient() {
  const t = useTranslations('social.landing');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));

  useEffect(() => {
    fetchPosts(selectedDate);
  }, [selectedDate]);

  const fetchPosts = async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.map(mapDbPostToSocialPost));
      } else {
        console.error('Failed to fetch posts');
        // Fallback to seed posts if API fails (optional, or just show empty)
        // setPosts(SEED_POSTS);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-[family-name:var(--font-manrope)] pt-20">
      <Header
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-12">
        {loading ? (
           <div className="flex justify-center py-20">{t('loading')}</div>
        ) : (
          /* Masonry Layout using CSS Columns */
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="break-inside-avoid block group"
              >
                <PostCard post={post} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

