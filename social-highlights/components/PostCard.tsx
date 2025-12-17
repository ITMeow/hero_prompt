import React from 'react';
import { Eye, Heart } from 'lucide-react';
import { SocialPost } from '../types';

interface PostCardProps {
  post: SocialPost;
  onClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="break-inside-avoid mb-6 bg-white rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group cursor-pointer border border-gray-100/50"
    >
      {/* Image Container */}
      <div className="relative w-full overflow-hidden">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ display: 'block' }}
        />
        {/* Overlay gradient only visible on hover maybe? Or subtle always. Let's keep it clean like the design. */}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg leading-tight text-gray-900 mb-2">
          {post.title}
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">
          {post.description}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-[#FFF6E5] px-2 py-1 rounded-full">
              <Eye size={12} className="text-[#FF9F2D]" />
              <span className="text-[10px] font-bold text-[#FF9F2D]">{post.stats.views}</span>
            </div>
            <div className="flex items-center gap-1 bg-[#FFEDF1] px-2 py-1 rounded-full">
              <Heart size={12} className="text-[#FF5E62]" />
              <span className="text-[10px] font-bold text-[#FF5E62]">{post.stats.likes}</span>
            </div>
          </div>
          
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {post.stats.timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
};