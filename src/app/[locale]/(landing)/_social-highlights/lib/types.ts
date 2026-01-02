export interface PostStats {
  likes: string;
  views?: string;
  comments?: string;
  timeAgo: string;
}

// Multi-language content structure
export interface I18nContent {
  en: {
    title: string;
    description: string;
    prompt: string;
  };
  'zh-CN': {
    title: string;
    description: string;
    prompt: string;
  };
}

// Database post structure (matches new schema)
export interface DbPost {
  id: string;
  i18nContent: I18nContent;
  tagsArray: {
    en: string[];
    'zh-CN': string[];
  } | null; // Multi-language tags
  sourceUrl: string;
  platform: 'x' | 'xiaohongshu' | 'youtube';
  author: string | null;
  authorAvatar: string | null;
  authorDisplayName: string | null;
  imageUrl: string;
  referenceImageUrl: string | null;
  likes: number;
  comments: number;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Frontend post structure (extracted for specific language)
export interface SocialPost {
  id: string;
  title: string; // Extracted from i18nContent based on current language
  description: string; // Extracted from i18nContent based on current language
  prompt: string; // Extracted from i18nContent based on current language
  imageUrl: string;
  referenceImageUrl?: string; // Optional reference image used for generation
  sourceUrl: string;
  platform: 'x' | 'xiaohongshu' | 'youtube';
  author?: string; // e.g. @username
  authorAvatar?: string | null;
  authorDisplayName?: string | null;
  stats: PostStats;
  tags?: string[]; // Array of tag keys (not translated)
  model?: string; // e.g. Nano Banana Pro
  aspectRatio?: string; // e.g. 3:4
  createdAt: number;
  updatedAt?: number;
  // Keep original i18n content for language switching
  i18nContent?: I18nContent;
}

export interface DateChip {
  label: string;
  subLabel?: string;
  isActive?: boolean;
}

export enum AppView {
  HOME = 'HOME',
  ADMIN = 'ADMIN',
  DETAIL = 'DETAIL'
}
