'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@/core/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import NProgress from 'nprogress';
import { PostCard } from './components/PostCard';
import { Header } from './components/Header';
import { SocialPost } from './lib/types';
import { mapDbPostToSocialPost } from './lib/utils';
import type { Language } from '@/shared/lib/tagTranslator';
import { Button } from '@/shared/components/ui/button';
import { Loader2 } from 'lucide-react';

import predefinedTags from '@/config/predefined_tags.json';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose 
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Filter } from 'lucide-react';

interface LandingClientProps {
  initialPosts?: any[];
  initialTotal?: number;
}

export default function LandingClient({ initialPosts = [], initialTotal = 0 }: LandingClientProps) {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  
  // Determine current language for data mapping
  const language: Language = locale === 'en' ? 'en' : 'zh-CN';
  const isZh = language === 'zh-CN';

  // Map initial posts to SocialPost format
  const [posts, setPosts] = useState<SocialPost[]>(() => 
    initialPosts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language))
  );
  
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select tags state
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tempTags, setTempTags] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [totalPosts, setTotalPosts] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialPosts.length > 0 ? initialPosts.length < initialTotal : true);
  
  // Track if it's the first render to avoid double fetching
  const isFirstRender = React.useRef(true);

  const fetchPosts = useCallback(async (offset: number, query: string, tags: Set<string>, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        NProgress.start();
      } else {
        setLoadingMore(true);
      }

      const limit = isLoadMore ? 12 : 30;
      const tagsParam = Array.from(tags).join(',');
      const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}&q=${encodeURIComponent(query)}&tags=${encodeURIComponent(tagsParam)}`);
      
      if (res.ok) {
        const data = await res.json();
        const mappedPosts = data.posts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language));
        
        setTotalPosts(data.total);

        if (isLoadMore) {
          setPosts(prev => [...prev, ...mappedPosts]);
        } else {
          setPosts(mappedPosts);
        }
        
        if (mappedPosts.length < limit) {
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

  // Initial fetch and Search/Tag change
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      // Skip initial fetch if we already have SSR data and no filters are applied
      if (isFirstRender.current) {
        isFirstRender.current = false;
        if (initialPosts.length > 0) return;
      }
      
      fetchPosts(0, searchQuery, activeTags, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTags, fetchPosts, initialPosts.length]);

  const handleLoadMore = useCallback(() => {
    const offset = posts.length;
    fetchPosts(offset, searchQuery, activeTags, true);
  }, [posts.length, searchQuery, activeTags, fetchPosts]);

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

  // Categories definition
  const categories = [
    { id: 'use_cases', label: isZh ? predefinedTags.use_cases.label_cn : predefinedTags.use_cases.label_en, tags: predefinedTags.use_cases.tags },
    { id: 'styles', label: isZh ? predefinedTags.styles.label_cn : predefinedTags.styles.label_en, tags: predefinedTags.styles.tags },
    { id: 'subjects', label: isZh ? predefinedTags.subjects.label_cn : predefinedTags.subjects.label_en, tags: predefinedTags.subjects.tags },
  ];

  const handleTagToggle = (tagKey: string) => {
    const newTags = new Set(tempTags);
    if (newTags.has(tagKey)) {
      newTags.delete(tagKey);
    } else {
      newTags.add(tagKey);
    }
    setTempTags(newTags);
  };

  const handleOpenFilter = () => {
    setTempTags(new Set(activeTags));
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setActiveTags(new Set(tempTags));
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setTempTags(new Set());
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background font-[family-name:var(--font-manrope)] pt-20">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="px-4 md:px-8 w-full mx-auto pb-12">
        <h1 className="sr-only">
          Hero Prompt - AI Prompt Management Tool
        </h1>
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          {t('trending_prompts')}
        </h2>
        {/* Filter Section */}
        <div className="flex flex-row justify-between items-center mb-8 gap-4">
          
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                onClick={handleOpenFilter}
                suppressHydrationWarning
                className="rounded-full px-6 h-10 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {t('filter_button') || 'Filter'}
                {activeTags.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center text-xs">
                    {activeTags.size}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('select_tags') || 'Select Tags'}</DialogTitle>
              </DialogHeader>
              
              <div className="py-4 space-y-8">
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {cat.label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {cat.tags.map((tag: any) => {
                        const isSelected = tempTags.has(tag.key);
                        return (
                          <button
                            key={tag.key}
                            onClick={() => handleTagToggle(tag.key)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary font-medium'
                                : 'bg-white dark:bg-secondary/30 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-primary/50 hover:text-primary'
                            }`}
                          >
                            {isZh ? tag.cn : tag.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="flex gap-2 sm:justify-between items-center">
                 <Button 
                   variant="ghost" 
                   onClick={handleResetFilter}
                   className="text-gray-500 hover:text-gray-900"
                 >
                   {t('reset') || 'Reset'}
                 </Button>
                 <div className="flex gap-2">
                   <DialogClose asChild>
                     <Button variant="outline">{t('cancel') || 'Cancel'}</Button>
                   </DialogClose>
                   <Button onClick={handleApplyFilter}>
                     {t('apply') || 'Apply'}
                   </Button>
                 </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Results Count */}
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
             {t('total_results', { count: totalPosts }) || `Total ${totalPosts} results`}
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center py-20">{t('loading')}</div>
        ) : (
          <>
            {posts.length === 0 ? (
               <div className="text-center py-20 text-gray-500">{t('post_not_found') || 'No posts found.'}</div>
            ) : (
              /* Responsive Grid Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 min-[1800px]:grid-cols-7 min-[2000px]:grid-cols-8 gap-4 md:gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block group w-full h-full"
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