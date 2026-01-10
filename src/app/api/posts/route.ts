import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { getPosts } from '@/shared/services/postService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? parseInt(offsetParam) : undefined;
    const q = searchParams.get('q') || '';
    const tagKeysParam = searchParams.get('tags') || '';
    const skipCount = searchParams.get('skipCount') === 'true';
    const sortParam = searchParams.get('sort');
    const sort = (sortParam === 'hot' || sortParam === 'top' || sortParam === 'new') ? sortParam : 'new';
    
    // Handle multiple tags
    const tags = tagKeysParam.split(',').filter(k => k && k !== 'all');

    const result = await getPosts({
      page,
      limit,
      offset,
      q,
      tags,
      skipCount,
      sort
    });

    return NextResponse.json(result);
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