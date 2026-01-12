import { SocialPost } from '@/app/[locale]/(landing)/_social-highlights/lib/types';

interface FeedState {
  posts: SocialPost[];
  scrollPosition: number;
  totalPosts: number;
  hasMore: boolean;
  searchQuery: string;
  activeTags: Set<string>;
  sortBy: 'new' | 'hot' | 'top';
  timestamp: number;
}

class FeedCache {
  private static instance: FeedCache;
  private cache: FeedState | null = null;
  private readonly MAX_AGE = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): FeedCache {
    if (!FeedCache.instance) {
      FeedCache.instance = new FeedCache();
    }
    return FeedCache.instance;
  }

  public set(state: Omit<FeedState, 'timestamp'>): void {
    this.cache = {
      ...state,
      timestamp: Date.now(),
    };
  }

  public get(): FeedState | null {
    if (!this.cache) return null;
    
    // Check expiry
    if (Date.now() - this.cache.timestamp > this.MAX_AGE) {
      this.cache = null;
      return null;
    }

    return this.cache;
  }

  public clear(): void {
    this.cache = null;
  }
  
  public hasData(): boolean {
    return !!this.cache;
  }
}

export const feedCache = FeedCache.getInstance();
