'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import NProgress from 'nprogress';
import { PostCard } from './components/PostCard';
import { Header } from './components/Header';
import { SocialPost } from './lib/types';
import { mapDbPostToSocialPost } from './lib/utils';
import type { Language } from '@/shared/lib/tagTranslator';
import { Button } from '@/shared/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useMediaQuery } from '@/shared/hooks/use-media-query';

export default function LandingClient() {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Responsive columns
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)');
  
  const numCols = useMemo(() => {
    if (isDesktop) return 3;
    if (isTablet) return 2;
    return 1;
  }, [isDesktop, isTablet]);

  // Distribute posts into columns for horizontal masonry order
  const columns = useMemo(() => {
    const cols: SocialPost[][] = Array.from({ length: numCols }, () => []);
    posts.forEach((post, index) => {
      cols[index % numCols].push(post);
    });
    return cols;
  }, [posts, numCols]);

  // Determine current language for data mapping
  const language: Language = locale === 'en' ? 'en' : 'zh-CN';

  const fetchPosts = useCallback(async (pageNum: number, query: string, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        NProgress.start();
      } else {
        setLoadingMore(true);
      }

      const res = await fetch(`/api/posts?page=${pageNum}&limit=15&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const mappedPosts = data.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language));
        
        if (isLoadMore) {
          setPosts(prev => [...prev, ...mappedPosts]);
        } else {
          setPosts(mappedPosts);
        }
        
        if (mappedPosts.length < 15) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch posts', res.status, res.statusText, errorData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isLoadMore) {
        setLoading(false);
        NProgress.done();
      } else {
        setLoadingMore(false);
      }
    }
  }, [language]);

  // Initial fetch and Search change
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1);
      fetchPosts(1, searchQuery, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, searchQuery, true);
  }, [page, searchQuery, fetchPosts]);

  // Use refs to access latest state in scroll handler
  const stateRef = React.useRef({ hasMore, loadingMore });
  stateRef.current = { hasMore, loadingMore };

  useEffect(() => {
    const handleScroll = () => {
      const { hasMore, loadingMore } = stateRef.current;
      
      // Calculate scroll position
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;

      // Trigger when within 300px of bottom
      if (scrollHeight - scrollTop - clientHeight < 300) {
        if (hasMore && !loadingMore) {
          handleLoadMore();
        }
      }
    };

    // Throttle scroll event slightly to improve performance
    let timeoutId: NodeJS.Timeout | null = null;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 100);
    };

    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleLoadMore]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background font-[family-name:var(--font-manrope)] pt-20">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-12">
        {loading ? (
           <div className="flex justify-center py-20">{t('loading')}</div>
        ) : (
          <>
            {posts.length === 0 ? (
               <div className="text-center py-20 text-gray-500">{t('post_not_found') || 'No posts found.'}</div>
            ) : (
              /* Custom Masonry Layout (Horizontal Order) */
              <div className="flex gap-6 items-start">
                {columns.map((colPosts, colIndex) => (
                  <div key={colIndex} className="flex-1 flex flex-col gap-6 min-w-0">
                    {colPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block group w-full"
                      >
                        <PostCard post={post} />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Infinite Scroll Loader */}
            {hasMore && (
              <div className="flex justify-center mt-12 py-8 min-h-[100px] w-full items-center">
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-gray-400" />
                    <span className="text-gray-400">Loading...</span>
                  </>
                ) : (
                  // Empty div that takes up space to ensure scrollbar exists if content is short
                  <div className="h-4" />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}