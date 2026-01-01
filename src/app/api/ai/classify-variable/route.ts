import { NextResponse } from 'next/server';
import { getAllConfigs } from '@/shared/models/config';
import { db } from '@/core/db';
import { promptVariableCategories } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

// Force dynamic to ensure we can read latest configs
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid input text' }, { status: 400 });
    }

    // 1. Fetch all active categories from DB dynamically
    let availableCategories: string[] = [];
    try {
        const categoriesDb = await db()
            .select({ name: promptVariableCategories.categoryEn })
            .from(promptVariableCategories)
            .where(eq(promptVariableCategories.isActive, true));
        
        availableCategories = categoriesDb.map(c => c.name);
    } catch (dbError) {
        console.error('Failed to fetch categories from DB:', dbError);
        // Fallback defaults if DB fails
        availableCategories = [
            'Style', 'Subject', 'Action', 'Lighting', 'Camera', 
            'Color', 'Material', 'Atmosphere', 'Artist', 'Quality', 'Composition'
        ];
    }

    const categoriesListString = availableCategories.join(', ');

    const SYSTEM_PROMPT = `
You are an expert AI Art Prompt Engineer assistant.
Your task is to categorize a given keyword or short phrase into one of the provided standard categories.

STRICTLY SELECT FROM THE FOLLOWING LIST OF CATEGORIES:
[${categoriesListString}]

INSTRUCTIONS:
1. Analyze the input text.
2. Determine the most likely categories from the "Available Categories" list above.
3. Return ONLY a valid JSON array of strings. Do not include markdown formatting.
4. Return up to 5 most relevant categories, sorted by relevance.
5. DO NOT invent new categories. If the exact category is not in the list, choose the semantically closest one from the list.
6. If the input is ambiguous, provide the most plausible guesses from the list.

Example Input: "sunset"
Example Output: ["Lighting", "Atmosphere", "Subject"] (Assuming these are in the list)
`;

    const configs = await getAllConfigs();
    const apiKey = configs.gemini_api_key || configs.google_api_key;
    
    if (!apiKey) {
      console.warn('Gemini API Key not set');
      // Return a basic fallback so the UI doesn't break
      return NextResponse.json({ categories: ['Style', 'Subject', 'Lighting'] });
    }

    const baseUrl = configs.gemini_base_url?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com';
    
    // Use Gemini 3 Flash Preview as strictly requested by user
    const model = 'gemini-3-flash-preview'; 
    const apiUrl = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `Classify this text: "${text}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Lower temperature to 0.1 for maximum determinism
        responseMimeType: "application/json"
      }
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Gemini API request failed: ${resp.status}`, errorText);
      throw new Error(`Gemini API request failed: ${resp.status}`);
    }

    const data = await resp.json();
    
    let categories: string[] = [];
    try {
      const candidate = data.candidates?.[0];
      if (candidate?.content?.parts?.[0]?.text) {
        let textResponse = candidate.content.parts[0].text;
        // Clean up markdown if present (though responseMimeType should handle it)
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const rawCategories = JSON.parse(textResponse);
        
        // Validate against available categories
        if (Array.isArray(rawCategories)) {
            categories = rawCategories.filter(c => availableCategories.includes(c));
            
            // If filtering removed everything (AI failed completely), fallback to raw AI output 
            // but log a warning, OR fallback to default if we want to be strict.
            // Let's fallback to 'Style' etc if empty to avoid breaking UI, or keep raw if we trust it might be a valid synonym?
            // User requested strictness.
            if (categories.length === 0 && rawCategories.length > 0) {
                console.warn('AI returned invalid categories:', rawCategories);
                // Try case-insensitive matching as a second chance
                categories = rawCategories.map(rc => {
                    const match = availableCategories.find(ac => ac.toLowerCase() === rc.toLowerCase());
                    return match || null;
                }).filter(Boolean) as string[];
            }
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      categories = ['Style', 'Subject', 'Lighting']; // Minimal fallback
    }

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Classification API Error:', error);
    return NextResponse.json({ categories: ['Style', 'Subject', 'Lighting'] });
  }
}
