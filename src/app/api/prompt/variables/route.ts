import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { promptVariableCategories, promptVariableKeywords } from '@/config/db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';

// Removed edge runtime to support standard Node.js database connections
// export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryEn = searchParams.get('category');

    if (!categoryEn) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const database = db();

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
