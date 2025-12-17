import { GoogleGenAI } from "@google/genai";
import { SocialPost } from "../types";

// Helper to determine platform
const detectPlatform = (url: string): 'x' | 'xiaohongshu' | 'other' => {
  if (url.includes('x.com') || url.includes('twitter.com')) return 'x';
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  return 'other';
};

export const extractPostInfo = async (url: string): Promise<Partial<SocialPost>> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  // We use Grounding (Google Search) to allow the model to "see" the content of the link
  // since standard LLMs cannot browse the web directly.
  const prompt = `
    I have a social media link: ${url}
    
    Please search for this specific post and extract the following information.
    Return ONLY a raw JSON object (no markdown formatting).
    
    Structure:
    {
      "title": "A catchy, short title (max 6-8 words) based on the post content",
      "description": "A summary of the post (max 20 words)",
      "stats": {
        "views": "Estimated views (e.g. 12k, 1.2M) - if not found, make a realistic guess based on popularity",
        "likes": "Estimated likes (e.g. 340) - if not found, make a realistic guess",
        "timeAgo": "Time since posted (e.g. 2h ago, 1d ago)"
      },
      "imageSearchQuery": "A very descriptive search query to find a visually similar image to the one in this post (e.g., 'minimalist workspace setup white desk', 'fluid art colorful abstract')"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        // Note: we don't set responseMimeType to JSON when using Search tool as it sometimes conflicts with tool output in current versions,
        // instead we parse the text manually.
      }
    });

    let jsonString = response.text || "{}";
    
    // Clean up markdown code blocks if present
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(jsonString);
    
    // Since we can't scrape the actual image URL due to CORS/Auth without a backend proxy,
    // we will use the generated 'imageSearchQuery' to provide a high-quality placeholder from unsplash/picsum 
    // or allow the user to input it. For this demo, we use a placeholder with a unique seed based on the title.
    
    return {
      title: data.title || "New Post",
      description: data.description || "No description available",
      platform: detectPlatform(url),
      sourceUrl: url,
      stats: {
        views: data.stats?.views || "1K",
        likes: data.stats?.likes || "100",
        timeAgo: data.stats?.timeAgo || "Just now"
      },
      // Using a deterministic random image based on title length for variety in demo
      imageUrl: `https://picsum.photos/seed/${data.title.replace(/\s/g,'')}/600/${Math.random() > 0.5 ? '800' : '600'}`
    };

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    // Fallback if AI fails
    return {
      title: "Extracted Content",
      description: "Could not extract details automatically. Please edit.",
      platform: detectPlatform(url),
      sourceUrl: url,
      stats: {
        views: "0",
        likes: "0",
        timeAgo: "now"
      },
      imageUrl: "https://picsum.photos/600/600"
    };
  }
};