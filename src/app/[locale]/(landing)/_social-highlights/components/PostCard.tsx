import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import moment from 'moment';
import { SocialPost } from '../lib/types';
import { processPromptContent } from '../lib/utils';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/badge';

interface PostCardProps {
  post: SocialPost;
  onClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const t = useTranslations('social.landing');
  const locale = useLocale();
  const router = useRouter();
  const [imgSrc, setImgSrc] = useState(post.imageUrl);
  const [hasError, setHasError] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Check if post is new (created today) - Client side only to prevent hydration mismatch
  useEffect(() => {
    setIsNew(moment(post.createdAt).isSame(moment(), 'day'));
  }, [post.createdAt]);

  // Update image source if post changes
  useEffect(() => {
    setImgSrc(post.imageUrl);
    setHasError(false);
  }, [post.imageUrl]);

  const handleImgError = () => {
    if (!hasError) {
      setImgSrc('/imgs/bg/tree.jpg');
      setHasError(true);
    }
  };

  const handleTryThis = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rawText = post.prompt || post.description || '';
    const processedText = processPromptContent(rawText);
    
    // Save to sessionStorage to avoid URL length limits
    sessionStorage.setItem('ai_generator_prompt', processedText);
    router.push(`/${locale}/ai-image-generator`);
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-[24px] overflow-hidden h-full",
        "bg-white dark:bg-card border border-gray-100 dark:border-border",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 group cursor-pointer relative",
        "flex flex-col"
      )}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50 dark:bg-muted">
        <div className="relative w-full h-full">
          <img 
            src={imgSrc} 
            alt={post.title} 
            onError={handleImgError}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            style={{ display: 'block' }}
          />
          
          {/* New Badge */}
          {isNew && (
            <div className="absolute top-3 right-3 z-10 transition-opacity duration-300 group-hover:opacity-0">
               <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-sm px-2 py-0.5 text-xs font-semibold">
                 New
               </Badge>
            </div>
          )}

          {/* Gradient Overlay for Title Readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <h3 className="text-white font-bold text-base leading-snug text-center line-clamp-2 drop-shadow-md">
              {post.title}
            </h3>
          </div>
          
          {/* "Try this" Button - Top Right */}
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <button 
              onClick={handleTryThis}
              className="bg-white/90 hover:bg-white backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm border border-white/50 hover:shadow-md transition-all"
            >
              <Sparkles size={14} className="text-primary" />
              <span>{t('try_this')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Prompt Text (Replacing Description) */}
        <p className="text-gray-600 dark:text-muted-foreground text-sm leading-relaxed line-clamp-4 h-[6.5em] text-left">
          {post.prompt || post.description /* Fallback to description if prompt is missing */}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary text-primary-foreground dark:bg-primary/20 dark:text-primary"
              >
                {tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

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