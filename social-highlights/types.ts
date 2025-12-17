export interface PostStats {
  views: string;
  likes: string;
  timeAgo: string;
}

export interface SocialPost {
  id: string;
  title: string;
  description: string;
  prompt?: string; // The AI generation prompt
  imageUrl: string;
  sourceUrl: string;
  platform: 'x' | 'xiaohongshu' | 'other';
  author?: string; // e.g. @username
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