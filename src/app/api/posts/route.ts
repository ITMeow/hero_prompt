import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { desc, and, gte, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    let whereClause = undefined;

    if (dateParam) {
      // Assuming dateParam is in YYYY-MM-DD format
      const startOfDay = new Date(dateParam);
      // Validate date
      if (!isNaN(startOfDay.getTime())) {
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        
        whereClause = and(
          gte(landingPost.createdAt, startOfDay),
          lt(landingPost.createdAt, endOfDay)
        );
      }
    }

    const posts = await db()
      .select()
      .from(landingPost)
      .where(whereClause)
      .orderBy(desc(landingPost.createdAt));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newPost = {
      id: nanoid(),
      ...body,
      // Ensure defaults if missing
      likes: 0,
      comments: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db().insert(landingPost).values(newPost);
    return NextResponse.json(newPost);
  } catch (error) {
    console.error('Failed to create post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
