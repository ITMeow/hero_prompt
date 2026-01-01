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

// Basic detection if content is JSON
export const isJsonContent = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const trimmed = text.trim();

  // CRITICAL: Check if it starts with {{ (variable syntax, not JSON)
  if (trimmed.startsWith('{{')) {
    return false;
  }

  // Check if it looks like JSON (starts with { or [)
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  // Try to parse as-is first
  try {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const textWithPlaceholders = trimmed.replace(variableRegex, 'null');
    JSON.parse(textWithPlaceholders);
    return true;
  } catch (e) {
    // Try to auto-fix common issues
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let fixed = trimmed;

    // Step 1: Clean up trailing garbage after valid JSON
    // Find where the JSON actually ends by matching balanced braces
    let textForCounting = trimmed.replace(variableRegex, '');

    const openBraces = (textForCounting.match(/\{/g) || []).length;
    const closeBraces = (textForCounting.match(/\}/g) || []).length;
    const openBrackets = (textForCounting.match(/\</g) || []).length;
    const closeBrackets = (textForCounting.match(/\>/g) || []).length;

    // Step 2: If braces are balanced, try to remove trailing garbage
    if (openBraces === closeBraces && openBrackets === closeBrackets) {
      // Find the position of the last valid JSON character (} or ])
      let lastValidPos = -1;
      if (trimmed.startsWith('{')) {
        lastValidPos = trimmed.lastIndexOf('}');
      } else if (trimmed.startsWith('[')) {
        lastValidPos = trimmed.lastIndexOf(']');
      }

      if (lastValidPos !== -1 && lastValidPos < trimmed.length - 1) {
        fixed = trimmed.substring(0, lastValidPos + 1);
      }
    } else {
      // Step 3: Add missing braces if needed
      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        fixed = fixed + '\n' + '}'.repeat(missing);
      }
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        fixed = fixed + ']'.repeat(missing);
      }
    }

    // Try parsing the fixed version
    try {
      const fixedWithPlaceholders = fixed.replace(variableRegex, 'null');
      JSON.parse(fixedWithPlaceholders);
      return true;
    } catch (e2) {
      return false;
    }
  }
};

// Auto-fix JSON if needed
export const getFixedContent = (text: string): string => {
  if (!isJsonContent(text)) return text;

  const trimmed = text.trim();

  // Try to parse as-is
  try {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const textWithPlaceholders = trimmed.replace(variableRegex, 'null');
    JSON.parse(textWithPlaceholders);
    return trimmed; // Valid, no fix needed
  } catch (e) {
    // Need to fix
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let fixed = trimmed;

    const textForCounting = trimmed.replace(variableRegex, '');
    const openBraces = (textForCounting.match(/\{/g) || []).length;
    const closeBraces = (textForCounting.match(/\}/g) || []).length;
    const openBrackets = (textForCounting.match(/\</g) || []).length;
    const closeBrackets = (textForCounting.match(/\>/g) || []).length;

    // If braces are balanced, remove trailing garbage
    if (openBraces === closeBraces && openBrackets === closeBrackets) {
      let lastValidPos = -1;
      if (trimmed.startsWith('{')) {
        lastValidPos = trimmed.lastIndexOf('}');
      } else if (trimmed.startsWith('[')) {
        lastValidPos = trimmed.lastIndexOf(']');
      }

      if (lastValidPos !== -1 && lastValidPos < trimmed.length - 1) {
        fixed = trimmed.substring(0, lastValidPos + 1);
      }
    } else {
      // Add missing braces
      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        fixed = trimmed + '\n' + '}'.repeat(missing);
      }
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        fixed = fixed + ']'.repeat(missing);
      }
    }

    // Verify the fix works
    try {
      const fixedWithPlaceholders = fixed.replace(variableRegex, 'null');
      JSON.parse(fixedWithPlaceholders);
      return fixed;
    } catch (e2) {
      return trimmed;
    }
  }
};

/**
 * Processes prompt content: fixes JSON and replaces variables
 */
export const processPromptContent = (content: string): string => {
  const fixedContent = getFixedContent(content || '');
  let textToProcess = fixedContent;
  const isJson = isJsonContent(content);

  // 1. If JSON, try to format it first
  if (isJson) {
    try {
      const jsonObj = JSON.parse(textToProcess);
      textToProcess = JSON.stringify(jsonObj, null, 2);
    } catch (e) {
      // Fallback to raw text if parse fails
    }
  }

  // 2. Replace variables {{ ... }} with their display values
  const variableRegex = /\{\{([^}]+)\}\}/g;
  textToProcess = textToProcess.replace(variableRegex, (match, variableName) => {
      const cleanVariableName = variableName.trim();
      const parts = cleanVariableName.split('|');
      
      if (parts.length === 3) {
          // Format: {{ RelationID|Key|Value }} -> Return Value
          return parts[2].trim();
      }
      
      // Format: {{ Variable }} -> Return Variable
      return cleanVariableName;
  });

  return textToProcess;
};
