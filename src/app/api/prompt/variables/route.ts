import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { promptVariableCategories, promptVariableKeywords } from '@/config/db/schema';
import { eq, desc, ilike, or, inArray, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

// Removed edge runtime to support standard Node.js database connections
// export const runtime = 'edge';

const getCachedVariables = async (categoryEn: string | null, categoriesParam: string | null) => {
  const fetchVariables = unstable_cache(
    async () => {
      const database = db();

      // --- Batch Mode ---
      if (categoriesParam) {
          const requestedCategories = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
          if (requestedCategories.length === 0) {
              return {};
          }

          // Normalize requested categories for loose matching (snake_case)
          const normalizedCategories = requestedCategories.map(c => c.replace(/\s+/g, '_'));
          const allSearchTerms = [...new Set([...requestedCategories, ...normalizedCategories])];

          const categories = await database.query.promptVariableCategories.findMany({
              where: inArray(sql`LOWER(${promptVariableCategories.categoryEn})`, allSearchTerms.map(c => c.toLowerCase()))
          });

          if (!categories.length) {
              return {};
          }

          const categoryIds = categories.map(c => c.id);

          // 2. Find all keywords for these categories
          const allKeywords = await database.query.promptVariableKeywords.findMany({
              where: inArray(promptVariableKeywords.categoryId, categoryIds),
              orderBy: [desc(promptVariableKeywords.priority)],
          });

          // 3. Group by Category EN Name
          const result: Record<string, any> = {};

          const keywordsByCatId = new Map<string, typeof allKeywords>();
          for (const k of allKeywords) {
              const list = keywordsByCatId.get(k.categoryId) || [];
              list.push(k);
              keywordsByCatId.set(k.categoryId, list);
          }

          for (const cat of categories) {
               const kws = keywordsByCatId.get(cat.id) || [];
               result[cat.categoryEn] = {
                   category: {
                       en: cat.categoryEn,
                       cn: cat.categoryCn,
                   },
                   keywords: kws.map(k => ({
                       id: k.id,
                       cn: k.keywordCn,
                       en: k.keywordEn,
                   }))
               };
          }

          return result;
      }

      // --- Single Mode (Legacy) ---
      if (!categoryEn) {
        return null;
      }

      const snakeCaseCategory = categoryEn.replace(/\s+/g, '_');
      
      const category = await database.query.promptVariableCategories.findFirst({
        where: or(
          eq(promptVariableCategories.categoryEn, categoryEn),
          ilike(promptVariableCategories.categoryEn, categoryEn),
          ilike(promptVariableCategories.categoryEn, snakeCaseCategory)
        ),
      });

      if (!category) {
        return { error: 'Category not found', keywords: [] };
      }

      const keywords = await database.query.promptVariableKeywords.findMany({
        where: eq(promptVariableKeywords.categoryId, category.id),
        orderBy: [desc(promptVariableKeywords.priority)],
      });

      return {
        category: {
          en: category.categoryEn,
          cn: category.categoryCn,
        },
        keywords: keywords.map(k => ({
          id: k.id,
          cn: k.keywordCn,
          en: k.keywordEn,
        })),
      };
    },
    ['prompt-variables', categoryEn || 'none', categoriesParam || 'none'],
    { 
      revalidate: 86400, // Cache for 24 hours (variables rarely change)
      tags: ['prompt-variables'] 
    }
  );

  return fetchVariables();
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryEn = searchParams.get('category');
    const categoriesParam = searchParams.get('categories');

    if (!categoryEn && !categoriesParam) {
       return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const result = await getCachedVariables(categoryEn, categoriesParam);

    if (!result) { // Should only happen if single mode categoryEn is null, handled above
         return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }

    if ('error' in result && result.error === 'Category not found') {
         return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching prompt variables:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
