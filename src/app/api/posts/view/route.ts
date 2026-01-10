import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPostView } from '@/config/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await db()
      .insert(landingPostView)
      .values({ postId, count: 1 })
      .onConflictDoUpdate({
        target: landingPostView.postId,
        set: {
          count: sql`${landingPostView.count} + 1`,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to increment view count:', error);
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 });
  }
}
