import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { landingPost } from '@/config/db/schema';
import { desc, sql, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import predefinedTags from '@/config/predefined_tags.json';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const q = searchParams.get('q') || '';
    const tagKeysParam = searchParams.get('tags') || '';
    const offset = (page - 1) * limit;

    let whereClause = undefined;
    const conditions = [];

    if (q) {
      conditions.push(sql`i18n_content::text ILIKE ${'%' + q + '%'}`);
    }
    
    // Handle multiple tags
    const tagKeys = tagKeysParam.split(',').filter(k => k && k !== 'all');
    
    if (tagKeys.length > 0) {
      const tagConditions = [];
      const categories = ['use_cases', 'styles', 'subjects'] as const;

      for (const key of tagKeys) {
        let tagInfo = null;
        for (const cat of categories) {
          // @ts-ignore
          const found = predefinedTags[cat].tags.find((t: any) => t.key === key);
          if (found) {
            tagInfo = found;
            break;
          }
        }

        if (tagInfo) {
          // @ts-ignore
          const enTag = JSON.stringify([tagInfo.en]);
          // @ts-ignore
          const cnTag = JSON.stringify([tagInfo.cn]);
          
          tagConditions.push(sql`(
            tags_array->'en' @> ${enTag}::jsonb OR 
            tags_array->'zh-CN' @> ${cnTag}::jsonb
          )`);
        }
      }

      if (tagConditions.length > 0) {
        // Combine tag conditions with OR (match any selected tag)
        const combinedTagCondition = tagConditions.reduce((acc, condition) => sql`${acc} OR ${condition}`);
        conditions.push(sql`(${combinedTagCondition})`);
      }
    }

    if (conditions.length > 0) {
      // Join all main conditions (Search AND Tags)
      whereClause = conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`);
    }

    // Get total count
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(landingPost)
      .where(whereClause);
    
    const total = Number(totalResult[0]?.count || 0);

    const posts = await db()
      .select()
      .from(landingPost)
      .where(whereClause)
      .orderBy(desc(landingPost.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      posts,
      total
    });
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