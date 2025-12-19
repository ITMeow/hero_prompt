import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const q = searchParams.get('q') || '';
    const offset = (page - 1) * limit;

    let whereClause = undefined;

    if (q) {
      whereClause = sql`i18n_content::text ILIKE ${'%' + q + '%'}`;
    }

    const posts = await db()
      .select()
      .from(landingPost)
      .where(whereClause)
      .orderBy(desc(landingPost.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newPost = {
      id: nanoid(),
      ...body,
      // Ensure defaults if missing
      likes: body.likes || 0,
      comments: body.comments || 0,
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
