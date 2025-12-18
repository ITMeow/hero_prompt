export interface PostStats {
  likes: string;
  views?: string;
  comments?: string;
  timeAgo: string;
}

export interface SocialPost {
  id: string;
  title: string;
  description: string;
  prompt?: string; // The AI generation prompt
  imageUrl: string;
  referenceImageUrl?: string; // Optional reference image used for generation
  sourceUrl: string;
  platform: 'x' | 'xiaohongshu' | 'other';
  author?: string; // e.g. @username
  authorAvatar?: string | null;
  authorDisplayName?: string | null;
  promptCn?: string | null;
  stats: PostStats;
  tags?: string[];
  model?: string; // e.g. Nano Banana Pro
  aspectRatio?: string; // e.g. 3:4
  createdAt: number;
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
