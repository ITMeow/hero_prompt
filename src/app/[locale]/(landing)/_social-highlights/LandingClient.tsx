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

export default function LandingClient() {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select tags state
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tempTags, setTempTags] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [totalPosts, setTotalPosts] = useState(0);
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
  const isZh = language === 'zh-CN';

  const fetchPosts = useCallback(async (pageNum: number, query: string, tags: Set<string>, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        NProgress.start();
      } else {
        setLoadingMore(true);
      }

      const tagsParam = Array.from(tags).join(',');
      const res = await fetch(`/api/posts?page=${pageNum}&limit=30&q=${encodeURIComponent(query)}&tags=${encodeURIComponent(tagsParam)}`);
      
      if (res.ok) {
        const data = await res.json();
        const mappedPosts = data.posts.map((dbPost: any) => mapDbPostToSocialPost(dbPost, language));
        
        setTotalPosts(data.total);

        if (isLoadMore) {
          setPosts(prev => [...prev, ...mappedPosts]);
        } else {
          setPosts(mappedPosts);
        }
        
        if (mappedPosts.length < 30) {
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
      setPage(1);
      fetchPosts(1, searchQuery, activeTags, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTags, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, searchQuery, activeTags, true);
  }, [page, searchQuery, activeTags, fetchPosts]);

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

      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-12">
        {/* Filter Section */}
        <div className="flex flex-row justify-between items-center mb-8 gap-4">
          
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                onClick={handleOpenFilter}
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