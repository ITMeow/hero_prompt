import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { eq, not, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  try {
    const posts = await db()
      .select()
      .from(landingPost)
      .where(eq(landingPost.id, id));

    if (!posts.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = posts[0];
    
    // Recommendation logic
    // Fetch candidates (e.g. 50 latest) excluding current
    const candidates = await db()
        .select()
        .from(landingPost)
        .where(not(eq(landingPost.id, id)))
        .orderBy(desc(landingPost.createdAt))
        .limit(50);

    let relatedPosts = [];
    
    if (post.tags) {
        const currentTags = post.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        
        const scored = candidates.map(p => {
            if (!p.tags) return { p, score: 0 };
            const pTags = p.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            const intersection = currentTags.filter(t => pTags.includes(t));
            return { p, score: intersection.length };
        });
        
        // Sort by score desc
        scored.sort((a, b) => b.score - a.score);
        relatedPosts = scored.slice(0, 3).map(x => x.p);
    } else {
        relatedPosts = candidates.slice(0, 3);
    }

    return NextResponse.json({ post, relatedPosts });
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
