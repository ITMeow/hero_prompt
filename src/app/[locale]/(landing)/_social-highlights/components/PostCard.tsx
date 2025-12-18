import React, { useState } from 'react';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { SocialPost } from '../lib/types';
import { cn } from '@/shared/lib/utils';

interface PostCardProps {
  post: SocialPost;
  onClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
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
        "bg-white border border-gray-100",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 group cursor-pointer relative",
        "flex flex-col"
      )}
    >
      {/* Image Container */}
      <div className="relative w-full overflow-hidden bg-gray-50">
        <div className="relative">
          <img 
            src={imgSrc} 
            alt={post.title} 
            onError={handleImgError}
            className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            style={{ display: 'block' }}
          />
          
          {/* Glass Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* "Try this" Button Overlay */}
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 ease-out">
            <div className="bg-white/90 backdrop-blur-md text-gray-900 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg border border-white/50">
              <Sparkles size={16} className="text-yellow-500" />
              <span>Try this</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg leading-tight text-gray-900 mb-2 line-clamp-2">
          {post.title}
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-grow">
          {post.description}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              <Heart size={12} className="text-rose-500 fill-rose-500" />
              <span className="text-[11px] font-bold text-rose-600">{post.stats.likes}</span>
            </div>
          </div>
          
          <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            {post.stats.timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
};
