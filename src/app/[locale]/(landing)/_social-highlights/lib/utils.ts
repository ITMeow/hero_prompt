import { SocialPost, I18nContent } from './types';
import moment from 'moment';
import type { Language } from '@/shared/lib/tagTranslator';

export const calculateTimeAgo = (dateStr: string | Date) => {
   const date = new Date(dateStr);
   const now = new Date();
   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

   if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
   if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
   if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
   return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

/**
 * Maps a database post to a SocialPost for frontend use
 * Extracts content for the specified language from i18nContent
 * @param dbPost The database post object
 * @param language The language to extract content for (defaults to 'zh-CN')
 * @returns A SocialPost object with extracted language-specific content
 */
export const mapDbPostToSocialPost = (
  dbPost: any,
  language: Language = 'zh-CN'
): SocialPost => {
  // Parse i18nContent if it's a string (from database)
  const i18nContent: I18nContent = typeof dbPost.i18nContent === 'string'
    ? JSON.parse(dbPost.i18nContent)
    : dbPost.i18nContent;

  // Extract content for the specified language, with fallback to English
  const content = i18nContent[language] || i18nContent['en'];

  // Extract tags for the specified language
  let tags: string[] = [];
  if (dbPost.tagsArray) {
    // Parse if string (though drizzle usually handles jsonb)
    const tagsObj = typeof dbPost.tagsArray === 'string' 
      ? JSON.parse(dbPost.tagsArray) 
      : dbPost.tagsArray;
      
    tags = tagsObj[language] || tagsObj['en'] || [];
  }

  return {
    id: dbPost.id,
    title: content.title,
    description: content.description,
    prompt: content.prompt,
    imageUrl: dbPost.imageUrl,
    referenceImageUrl: dbPost.referenceImageUrl,
    sourceUrl: dbPost.sourceUrl,
    platform: dbPost.platform,
    author: dbPost.author,
    authorAvatar: dbPost.authorAvatar,
    authorDisplayName: dbPost.authorDisplayName,
    model: dbPost.model,
    tags: tags,
    createdAt: new Date(dbPost.createdAt).getTime(),
    i18nContent, // Keep original for language switching
    stats: {
      likes: dbPost.likes.toString(),
      comments: dbPost.comments?.toString() || '0',
      timeAgo: moment(dbPost.createdAt).format('YYYY-MM-DD HH:mm'),
    }
  };
}
