import { db } from '@/core/db';
import { landingPost, landingPostView } from '@/config/db/schema';
import { desc, sql, eq, getTableColumns } from 'drizzle-orm';
import predefinedTags from '@/config/predefined_tags.json';

export async function getPosts(options: {
  page?: number;
  limit?: number;
  offset?: number;
  q?: string;
  tags?: string[];
  skipCount?: boolean;
  sort?: 'new' | 'hot' | 'top';
}) {
  const { page = 1, limit = 15, q = '', tags = [], skipCount = false, sort = 'new' } = options;
  const offset = options.offset !== undefined ? options.offset : (page - 1) * limit;

  let whereClause = undefined;
  const conditions = [];

  if (q) {
    conditions.push(sql`i18n_content::text ILIKE ${'%' + q + '%'}`);
  }
  
  if (tags.length > 0) {
      const tagConditions = [];
      const categories = ['use_cases', 'styles', 'subjects'] as const;

      for (const key of tags) {
        if (key === 'all') continue;
        
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

    let orderByClause: any = desc(landingPost.createdAt);
    if (sort === 'hot') {
      // Sort by view count, defaulting to 0 if null
      orderByClause = desc(sql`COALESCE(${landingPostView.count}, 0)`); 
    } else if (sort === 'top') {
      orderByClause = desc(landingPost.likes); 
    }

    const postsQuery = db()
      .select({ ...getTableColumns(landingPost) })
      .from(landingPost)
      .leftJoin(landingPostView, eq(landingPost.id, landingPostView.postId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    if (skipCount) {
      const posts = await postsQuery;
      return { posts, total: -1 };
    }

    const countQuery = db()
      .select({ count: sql<number>`count(*)` })
      .from(landingPost)
      .where(whereClause);
    
    const [posts, totalResult] = await Promise.all([
      postsQuery,
      countQuery
    ]);

    const total = Number(totalResult[0]?.count || 0);

    return { posts, total };
}
