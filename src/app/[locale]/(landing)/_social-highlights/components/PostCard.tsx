import React, { useState } from 'react';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SocialPost } from '../lib/types';
import { cn } from '@/shared/lib/utils';

interface PostCardProps {
  post: SocialPost;
  onClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const t = useTranslations('social.landing');
  const [imgSrc, setImgSrc] = useState(post.imageUrl);
  const [hasError, setHasError] = useState(false);

  const handleImgError = () => {
    if (!hasError) {
      setImgSrc('/imgs/bg/tree.jpg');
      setHasError(true);
    }
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "break-inside-avoid mb-6 rounded-[24px] overflow-hidden",
        "bg-white dark:bg-card border border-gray-100 dark:border-border",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 group cursor-pointer relative",
        "flex flex-col"
      )}
    >
      {/* Image Container */}
      <div className="relative w-full overflow-hidden bg-gray-50 dark:bg-muted">
        <div className="relative">
          <img 
            src={imgSrc} 
            alt={post.title} 
            onError={handleImgError}
            className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            style={{ display: 'block' }}
          />
          
          {/* Gradient Overlay for Title Readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <h3 className="text-white font-bold text-base leading-snug text-center line-clamp-2 drop-shadow-md">
              {post.title}
            </h3>
          </div>
          
          {/* "Try this" Button Overlay - Moved to Top Right */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0 transition-all duration-300 ease-out z-20">
            <div className="bg-white/90 backdrop-blur-md text-gray-900 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-white/50">
              <Sparkles size={14} className="text-primary" />
              <span>{t('try_this')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Prompt Text (Replacing Description) */}
        <p className="text-gray-600 dark:text-muted-foreground text-sm leading-relaxed line-clamp-4 min-h-[1.5rem]">
          {post.prompt || post.description /* Fallback to description if prompt is missing */}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-border mt-auto">
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-muted px-2.5 py-1 rounded-full border border-gray-100 dark:border-border">
              <Heart size={12} className="text-gray-400" />
              <span className="text-[11px] font-bold text-gray-600 dark:text-muted-foreground">{post.stats.likes}</span>
            </div>
          </div>
          
          <span className="text-[11px] font-medium text-gray-400 bg-gray-50 dark:bg-muted px-2.5 py-1 rounded-full border border-gray-100 dark:border-border">
            {post.stats.timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
};
