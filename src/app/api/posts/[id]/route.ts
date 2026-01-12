import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { eq, not, desc, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

const getCachedPostData = async (id: string) => {
  const fetchData = unstable_cache(
    async () => {
      const posts = await db()
        .select()
        .from(landingPost)
        .where(eq(landingPost.id, id));

      if (!posts.length) {
        return null;
      }

      const post = posts[0];

      // Helper to extract all tags from multilingual object
      const getAllTags = (tagsObj: any): string[] => {
        if (!tagsObj) return [];
        if (Array.isArray(tagsObj)) return tagsObj; // legacy support if any
        // tagsObj is { en: string[], 'zh-CN': string[] }
        // Extract all arrays and flatten
        return Object.values(tagsObj).flat() as string[];
      };

      // Recommendation logic based on tags similarity
      // Fetch candidates (e.g. 50 latest) excluding current
      const candidates = await db()
        .select()
        .from(landingPost)
        .where(not(eq(landingPost.id, id)))
        .orderBy(desc(landingPost.createdAt))
        .limit(50);

      let relatedPosts = [];

      const currentPostTags = getAllTags(post.tagsArray);

      if (currentPostTags.length > 0) {
        // Calculate tag similarity for each candidate
        const scored = candidates.map(p => {
          const candidateTags = getAllTags(p.tagsArray);
          
          if (candidateTags.length === 0) {
            return { p, score: 0 };
          }

          // Count matching tags (intersection)
          const matchingTags = candidateTags.filter(tag =>
            currentPostTags.includes(tag)
          );

          return { p, score: matchingTags.length };
        });

        // Sort by score (most similar first), then by likes, then by date
        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.p.likes !== a.p.likes) return b.p.likes - a.p.likes;
          return new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime();
        });

        // Take top 6 posts with at least 1 matching tag
        relatedPosts = scored
          .filter(x => x.score > 0)
          .slice(0, 6)
          .map(x => x.p);
      } else {
        // If current post has no tags, just return most recent posts
        relatedPosts = candidates.slice(0, 6);
      }

      return { post, relatedPosts };
    },
    ['api-post-data', id],
    { tags: ['posts', `post-${id}`], revalidate: 3600 }
  );

  return fetchData();
};

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  try {
    const data = await getCachedPostData(id);

    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
