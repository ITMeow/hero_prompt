import { SocialPost } from '@/app/[locale]/(landing)/_social-highlights/lib/types';

class PostCache {
  private static instance: PostCache;
  private cache: Map<string, SocialPost>;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): PostCache {
    if (!PostCache.instance) {
      PostCache.instance = new PostCache();
    }
    return PostCache.instance;
  }

  public set(post: SocialPost): void {
    if (post && post.id) {
      this.cache.set(post.id, post);
    }
  }

  public setAll(posts: SocialPost[]): void {
    posts.forEach(post => this.set(post));
  }

  public get(id: string): SocialPost | undefined {
    return this.cache.get(id);
  }

  public has(id: string): boolean {
    return this.cache.has(id);
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const postCache = PostCache.getInstance();
