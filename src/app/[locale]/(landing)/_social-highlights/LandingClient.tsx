'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from '@/core/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import NProgress from 'nprogress';
import { PostCard } from './components/PostCard';
import { SocialPost } from './lib/types';
import { mapDbPostToSocialPost } from './lib/utils';
import type { Language } from '@/shared/lib/tagTranslator';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { 
  Loader2, 
  Search, 
  Flame, 
  Trophy, 
  Clock, 
  Filter, 
  X,
  Menu
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import predefinedTags from '@/config/predefined_tags.json';
import { Badge } from '@/shared/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { postCache } from '@/shared/lib/postCache';
import { feedCache } from '@/shared/lib/feedCache';

interface LandingClientProps {
  initialPosts?: any[];
  initialTotal?: number;
}

type SortOption = 'new' | 'hot' | 'top';

export default function LandingClient({ initialPosts = [], initialTotal = 0 }: LandingClientProps) {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  
  // Determine current language for data mapping
  const language: Language = locale === 'en' ? 'en' : 'zh-CN';
  const isZh = language === 'zh-CN';

  // Try to restore from feed cache
  const cachedState = React.useMemo(() => feedCache.get(), []);

  // Map initial posts to SocialPost format
  const [posts, setPosts] = useState<SocialPost[]>(() => {
    if (cachedState) return cachedState.posts;

    const mapped = initialPosts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language));
    // Cache initial posts
    postCache.setAll(mapped);
    return mapped;
  });
  
  const [loading, setLoading] = useState(!cachedState && initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(cachedState?.searchQuery || '');
  const [searchInput, setSearchInput] = useState(cachedState?.searchQuery || '');
  
  // Filter & Sort State
  const [activeTags, setActiveTags] = useState<Set<string>>(cachedState?.activeTags || new Set());
  const [sortBy, setSortBy] = useState<SortOption>(cachedState?.sortBy || 'new');

  const [totalPosts, setTotalPosts] = useState(cachedState?.totalPosts ?? initialTotal);
  const [hasMore, setHasMore] = useState(cachedState?.hasMore ?? (initialPosts.length > 0 ? initialPosts.length < initialTotal : true));
  
  // Track if we are navigating away explicitly (e.g. clicking a post)
  // This prevents the unmount cleanup from overwriting the correct scroll position with 0
  const isNavigatingRef = React.useRef(false);

  // Restore scroll position
  useEffect(() => {
    if (cachedState) {
      // Use requestAnimationFrame to scroll as soon as possible after layout
      const restoreScroll = () => {
        window.scrollTo({ top: cachedState.scrollPosition, behavior: 'instant' });
      };
      
      requestAnimationFrame(restoreScroll);
      
      // Fallback: try again after a short delay to handle images/layout shifts
      const timer = setTimeout(restoreScroll, 100);
      
      return () => clearTimeout(timer);
    }
  }, [cachedState]);

  // Keep a ref of current state for unmount saving
  const currentStateRef = React.useRef({ posts, totalPosts, hasMore, searchQuery, activeTags, sortBy });
  useEffect(() => {
    currentStateRef.current = { posts, totalPosts, hasMore, searchQuery, activeTags, sortBy };
  }, [posts, totalPosts, hasMore, searchQuery, activeTags, sortBy]);

  // Save state on unmount
  useEffect(() => {
    return () => {
      // If we are navigating explicitly (e.g. clicked a post), the state was already saved correctly.
      // We skip saving here to avoid race conditions where window.scrollY might be reset to 0 by Next.js
      if (isNavigatingRef.current) return;

      const scrollPosition = window.scrollY;
      feedCache.set({
        ...currentStateRef.current,
        scrollPosition
      });
    };
  }, []);

  const fetchPosts = useCallback(async (offset: number, query: string, tags: Set<string>, sort: SortOption, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        if (posts.length === 0) {
          setLoading(true);
        }
        NProgress.start();
      } else {
        setLoadingMore(true);
      }

      const limit = 50;
      const tagsParam = Array.from(tags).join(',');
      const skipCountParam = isLoadMore ? '&skipCount=true' : '';
      const sortParam = `&sort=${sort}`;
      
      const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}&q=${encodeURIComponent(query)}&tags=${encodeURIComponent(tagsParam)}${sortParam}${skipCountParam}`, {
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        const mappedPosts = data.posts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language));
        
        // Cache fetched posts
        postCache.setAll(mappedPosts);
        
        if (data.total !== -1) {
          setTotalPosts(data.total);
        }

        if (isLoadMore) {
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = mappedPosts.filter((p: SocialPost) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        } else {
          setPosts(mappedPosts);
        }
        
        if (mappedPosts.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        console.error('Failed to fetch posts', res.status);
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
  }, [language, posts.length]);

  // Initial fetch and Search/Tag/Sort change
  useEffect(() => {
    // Skip initial fetch if we restored from cache
    if (isFirstRender.current) {
      // If we have cachedState, we skip. But we need to ensure subsequent updates trigger fetch.
      // The refs logic below handles this.
      isFirstRender.current = false; 
    }
  }, []);

  // Use a ref to track if we should fetch on filter changes
  // We want to skip the very first run if we have cached state (because the state matches the cache)
  const shouldFetchOnUpdate = React.useRef(!cachedState);
  
  useEffect(() => {
    if (shouldFetchOnUpdate.current) {
      fetchPosts(0, searchQuery, activeTags, sortBy, false);
    } else {
      // First run with cached state: skip fetch, but enable for next updates
      shouldFetchOnUpdate.current = true;
    }
  }, [searchQuery, activeTags, sortBy, fetchPosts]); 


  const handleLoadMore = useCallback(() => {
    const offset = posts.length;
    fetchPosts(offset, searchQuery, activeTags, sortBy, true);
  }, [posts.length, searchQuery, activeTags, sortBy, fetchPosts]);

  const handlePostClick = useCallback(async (postId: string) => {
    // Mark as navigating so unmount cleanup doesn't overwrite our scroll position
    isNavigatingRef.current = true;

    // Save state before navigation
    const scrollPosition = window.scrollY;
    feedCache.set({
      ...currentStateRef.current,
      scrollPosition
    });
    
    try {
      await fetch('/api/posts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
    } catch (err) {
      console.error('Failed to increment view count', err);
    }
  }, []);

  // Scroll handling
  const scrollStateRef = React.useRef({ hasMore, loadingMore });
  scrollStateRef.current = { hasMore, loadingMore };

  useEffect(() => {
    const handleScroll = () => {
      const { hasMore, loadingMore } = scrollStateRef.current;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;

      if (scrollHeight - scrollTop - clientHeight < 1200) {
        if (hasMore && !loadingMore) {
          handleLoadMore();
        }
      }
    };

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

  // Categories definition
  const categories = [
    { id: 'use_cases', label: isZh ? predefinedTags.use_cases.label_cn : predefinedTags.use_cases.label_en, tags: predefinedTags.use_cases.tags },
    { id: 'styles', label: isZh ? predefinedTags.styles.label_cn : predefinedTags.styles.label_en, tags: predefinedTags.styles.tags },
    { id: 'subjects', label: isZh ? predefinedTags.subjects.label_cn : predefinedTags.subjects.label_en, tags: predefinedTags.subjects.tags },
  ];

  const handleTagToggle = (tagKey: string) => {
    setActiveTags(prev => {
      const newTags = new Set(prev);
      if (newTags.has(tagKey)) {
        newTags.delete(tagKey);
      } else {
        newTags.add(tagKey);
      }
      return newTags;
    });
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col gap-6 h-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSearchQuery(searchInput);
            }
          }}
          placeholder={t('search_placeholder') || "Search prompts..."}
          className="pl-9 bg-white dark:bg-muted/50 border-gray-200 dark:border-border"
        />
      </div>

      {/* Sort Menu */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
          {t('sort_by') || 'Sort By'}
        </h3>
        <nav className="flex flex-col space-y-1">
          <Button 
            variant={sortBy === 'hot' ? 'secondary' : 'ghost'} 
            className={cn("justify-start", sortBy === 'hot' && "bg-gray-100 dark:bg-muted font-semibold")}
            onClick={() => setSortBy('hot')}
          >
            <Flame className={cn("mr-2 h-4 w-4", sortBy === 'hot' ? "text-orange-500" : "text-gray-500")} />
            {t('sort_hot') || 'Hot'}
          </Button>
          <Button 
            variant={sortBy === 'top' ? 'secondary' : 'ghost'} 
            className={cn("justify-start", sortBy === 'top' && "bg-gray-100 dark:bg-muted font-semibold")}
            onClick={() => setSortBy('top')}
          >
            <Trophy className={cn("mr-2 h-4 w-4", sortBy === 'top' ? "text-yellow-500" : "text-gray-500")} />
            {t('sort_top') || 'Top'}
          </Button>
          <Button 
            variant={sortBy === 'new' ? 'secondary' : 'ghost'} 
            className={cn("justify-start", sortBy === 'new' && "bg-gray-100 dark:bg-muted font-semibold")}
            onClick={() => setSortBy('new')}
          >
            <Clock className={cn("mr-2 h-4 w-4", sortBy === 'new' ? "text-blue-500" : "text-gray-500")} />
            {t('sort_new') || 'New'}
          </Button>
        </nav>
      </div>

      {/* Filter Categories */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
              {cat.label}
            </h3>
            <div className="flex flex-col space-y-1">
              {cat.tags.map((tag: any) => {
                const isSelected = activeTags.has(tag.key);
                return (
                  <Button
                    key={tag.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTagToggle(tag.key)}
                    className={cn(
                      "justify-start h-auto py-2 px-2 text-sm font-normal", 
                      isSelected ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("w-4 h-4 mr-2 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600")}>
                      {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    {isZh ? tag.cn : tag.en}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background font-[family-name:var(--font-manrope)] pt-20">
      <div className="max-w-[1920px] mx-auto px-4 md:px-8 pb-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Mobile Filter Sheet */}
          <div className="md:hidden w-full sticky top-20 z-30 bg-[#F0F2F5] dark:bg-background py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between" suppressHydrationWarning>
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {t('filter_button') || 'Filter'}
                  </span>
                  {(activeTags.size > 0 || sortBy !== 'new' || searchQuery) && (
                    <Badge variant="secondary" className="h-5 px-1.5 rounded-full text-xs">
                       Changed
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="mb-4">
                  <SheetTitle>{t('filters') || 'Filters'}</SheetTitle>
                </SheetHeader>
                {renderSidebarContent()}
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-hidden">
             {renderSidebarContent()}
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full min-w-0">
            {loading ? (
              <div className="flex justify-center py-20">{t('loading')}</div>
            ) : (
              <>
                {posts.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">{t('post_not_found') || 'No posts found.'}</div>
                ) : (
                  /* Responsive Grid Layout */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-[2px]">
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block group w-full h-full"
                        onClick={() => handlePostClick(post.id)}
                      >
                        <PostCard post={post} />
                      </Link>
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
                      <div className="h-4" />
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}