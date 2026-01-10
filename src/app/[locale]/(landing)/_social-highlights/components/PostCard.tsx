'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [isUnoptimized, setIsUnoptimized] = useState(() => 
    post.imageUrl?.includes('twimg.com')
  );

  // Check if post is new (created today) - Client side only to prevent hydration mismatch
  useEffect(() => {
    setIsNew(moment(post.createdAt).isSame(moment(), 'day'));
  }, [post.createdAt]);

  // Update image source if post changes
  useEffect(() => {
    setImgSrc(post.imageUrl);
    setIsLoading(true); // Reset loading state when image changes
    setIsUnoptimized(post.imageUrl?.includes('twimg.com')); // Check optimization state
  }, [post.imageUrl]);

  const handleImgError = () => {
    if (!isUnoptimized) {
      // First try: Disable optimization to fetch directly from browser
      // This helps when Next.js server cannot reach the image (e.g. firewalls/VPN) but user can
      setIsUnoptimized(true);
    } else {
      // Second try: Fallback to placeholder if direct fetch also fails
      setImgSrc('/imgs/bg/tree.jpg');
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
        "rounded-[6px] overflow-hidden h-full",
        "bg-white dark:bg-card border border-gray-100 dark:border-border",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 group cursor-zoom-in relative",
        "flex flex-col"
      )}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-muted">
        <div className="relative w-full h-full">
          <Image
            src={imgSrc} 
            alt={post.title}
            fill
            unoptimized={isUnoptimized}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 16vw"
            className={cn(
              "object-cover transition-all duration-700 ease-out",
              "group-hover:scale-105",
              isLoading ? "scale-110 blur-xl grayscale" : "scale-100 blur-0 grayscale-0"
            )}
            onLoad={() => setIsLoading(false)}
            onError={handleImgError}
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
            <h3 className="text-white font-bold text-base leading-snug text-center line-clamp-1 drop-shadow-md">
              {post.title}
            </h3>
          </div>
          
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 h-[20px] overflow-hidden">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary text-primary-foreground dark:bg-primary/20 dark:text-primary whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
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