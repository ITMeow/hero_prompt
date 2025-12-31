import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { promptVariableCategories, promptVariableKeywords } from '@/config/db/schema';
import { eq, desc, ilike, or, inArray, sql } from 'drizzle-orm';

// Removed edge runtime to support standard Node.js database connections
// export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryEn = searchParams.get('category');
    const categoriesParam = searchParams.get('categories');

    const database = db();

    // --- Batch Mode ---
    if (categoriesParam) {
        const requestedCategories = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
        if (requestedCategories.length === 0) {
            return NextResponse.json({});
        }

        // Normalize requested categories for loose matching (snake_case)
        // We will try to match original or snake_case version
        // SQL 'IN' clause with flexible matching is tricky, so we might need to rely on 'or' or just normalize input
        // For simplicity and performance in batch, we assume standard naming or basic normalization
        const normalizedCategories = requestedCategories.map(c => c.replace(/\s+/g, '_'));
        const allSearchTerms = [...new Set([...requestedCategories, ...normalizedCategories])];

        // 1. Find all matching categories
        // Note: ilike with inArray is not directly supported in standard simple syntax usually, 
        // but we can query where categoryEn IN (...) ignoring case if possible, or just strict match for batch efficiency.
        // Let's use lower case matching if possible or just standard 'inArray'. 
        // For best compatibility with the singular 'ilike' logic, we'd ideally want case-insensitive match for all.
        // But for batch, let's try standard 'inArray' on lowercase first.
        
        const categories = await database.query.promptVariableCategories.findMany({
            where: inArray(sql`LOWER(${promptVariableCategories.categoryEn})`, allSearchTerms.map(c => c.toLowerCase()))
        });

        if (!categories.length) {
            return NextResponse.json({});
        }

        const categoryIds = categories.map(c => c.id);

        // 2. Find all keywords for these categories
        const allKeywords = await database.query.promptVariableKeywords.findMany({
            where: inArray(promptVariableKeywords.categoryId, categoryIds),
            orderBy: [desc(promptVariableKeywords.priority)],
        });

        // 3. Group by Category EN Name (using the one found in DB)
        const result: Record<string, any> = {};

        // Helper map to quickly find keywords for a category ID
        const keywordsByCatId = new Map<string, typeof allKeywords>();
        for (const k of allKeywords) {
            const list = keywordsByCatId.get(k.categoryId) || [];
            list.push(k);
            keywordsByCatId.set(k.categoryId, list);
        }

        for (const cat of categories) {
             const kws = keywordsByCatId.get(cat.id) || [];
             // We use the DB category name as the key, or we could map back to requested.
             // Using DB name is safer.
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

        return NextResponse.json(result);
    }

    // --- Single Mode (Legacy) ---
    if (!categoryEn) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Prepare search variations to handle casing and spaces vs underscores
    // e.g. "Art Style" -> "art_style", "Role" -> "role"
    const snakeCaseCategory = categoryEn.replace(/\s+/g, '_');
    
    // 1. Find the category with flexible matching
    const category = await database.query.promptVariableCategories.findFirst({
      where: or(
        eq(promptVariableCategories.categoryEn, categoryEn),
        ilike(promptVariableCategories.categoryEn, categoryEn),
        ilike(promptVariableCategories.categoryEn, snakeCaseCategory)
      ),
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found', keywords: [] }, { status: 404 });
    }

    // 2. Find keywords for this category
    const keywords = await database.query.promptVariableKeywords.findMany({
      where: eq(promptVariableKeywords.categoryId, category.id),
      orderBy: [desc(promptVariableKeywords.priority)],
    });

    return NextResponse.json({
      category: {
        en: category.categoryEn,
        cn: category.categoryCn,
      },
      keywords: keywords.map(k => ({
        id: k.id,
        cn: k.keywordCn,
        en: k.keywordEn,
      })),
    });

  } catch (error) {
    console.error('Error fetching prompt variables:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
