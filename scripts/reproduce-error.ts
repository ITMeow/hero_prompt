
import { db } from '../src/core/db';
import { promptVariableCategories } from '../src/config/db/schema';
import { eq, ilike, or } from 'drizzle-orm';

async function reproduce() {
  const database = db();
  const categoryEn = '7';
  const snakeCaseCategory = '7';

  console.log("Attempting query...");
  try {
    const category = await database.query.promptVariableCategories.findFirst({
      where: or(
        eq(promptVariableCategories.categoryEn, categoryEn),
        ilike(promptVariableCategories.categoryEn, categoryEn),
        ilike(promptVariableCategories.categoryEn, snakeCaseCategory)
      ),
    });
    console.log("Query success:", category);
  } catch (e: any) {
    console.error("Query failed!");
    console.error(e);
    if (e.query) console.error("Query string:", e.query);
    if (e.params) console.error("Params:", e.params);
  }
  process.exit(0);
}

reproduce();
