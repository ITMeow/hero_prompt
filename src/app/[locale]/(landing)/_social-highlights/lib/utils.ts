import { SocialPost } from './types';
import moment from 'moment';

export const calculateTimeAgo = (dateStr: string | Date) => {
   const date = new Date(dateStr);
   const now = new Date();
   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
   
   if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
   if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
   if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
   return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export const mapDbPostToSocialPost = (dbPost: any): SocialPost => {
  return {
    id: dbPost.id,
    title: dbPost.title,
    description: dbPost.description,
    prompt: dbPost.prompt,
    imageUrl: dbPost.imageUrl,
    referenceImageUrl: dbPost.referenceImageUrl,
    sourceUrl: dbPost.sourceUrl,
    platform: dbPost.platform,
    author: dbPost.author,
    authorAvatar: dbPost.authorAvatar,
    authorDisplayName: dbPost.authorDisplayName,
    promptCn: dbPost.promptCn,
    model: dbPost.model,
    tags: dbPost.tags ? dbPost.tags.split(',') : [],
    createdAt: new Date(dbPost.createdAt).getTime(),
    stats: {
      likes: dbPost.likes.toString(),
      comments: dbPost.comments.toString(),
      timeAgo: moment(dbPost.createdAt).format('YYYY-MM-DD HH:mm'),
    }
  };
}
