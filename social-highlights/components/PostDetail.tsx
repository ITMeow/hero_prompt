import React from 'react';
import { ArrowLeft, Copy, Share2, Bookmark, RectangleHorizontal, RectangleVertical, Monitor } from 'lucide-react';
import { SocialPost } from '../types';
import { PostCard } from './PostCard';

interface PostDetailProps {
  post: SocialPost;
  relatedPosts: SocialPost[];
  onBack: () => void;
  onPostClick: (post: SocialPost) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, relatedPosts, onBack, onPostClick }) => {
  const handleCopyPrompt = () => {
    const text = post.prompt || post.description;
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
        >
          <ArrowLeft size={18} className="mr-2" /> Back to Gallery
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column - Image */}
          <div className="flex flex-col gap-6">
            <div className="bg-black rounded-[32px] p-3 shadow-2xl">
               <div className="relative rounded-[24px] overflow-hidden bg-gray-900 w-full">
                 <img 
                   src={post.imageUrl} 
                   alt={post.title} 
                   className="w-full h-auto object-cover block"
                 />
                 {/* Decorative card border effect from screenshot */}
                 <div className="absolute inset-0 border-[6px] border-[#D4AF37]/20 rounded-[24px] pointer-events-none"></div>
               </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-2 mb-6">
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-semibold">
                Text-to-Image
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-8">
              <button 
                onClick={handleCopyPrompt}
                className="bg-[#FFEA00] hover:bg-[#ffe100] text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
              >
                <Copy size={18} />
                Copy Prompt
              </button>
              <button className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
                 <Share2 size={18} />
              </button>
               <button className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
                 <Bookmark size={18} />
              </button>
            </div>

            {/* Prompt Section */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Generate for: [{post.title}]
              </p>
              <div className="prose prose-sm text-slate-700 max-w-none font-medium leading-relaxed whitespace-pre-line">
                {post.prompt ? post.prompt : post.description}
                {!post.prompt && "\n\n(Full prompt not available, showing description)"}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="space-y-6">
              {/* Aspect Ratio */}
              <div>
                <h3 className="font-bold text-sm mb-2">Aspect Ratio</h3>
                <div className="flex items-center gap-2">
                   <div className="w-10 h-10 border-2 border-slate-900 rounded-lg flex items-center justify-center">
                      <RectangleVertical size={20} fill="currentColor" className="text-slate-900"/>
                   </div>
                   <span className="font-medium">{post.aspectRatio || '3:4'}</span>
                </div>
              </div>

              {/* Source */}
              <div>
                 <h3 className="font-bold text-sm mb-2">Source</h3>
                 <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                    {post.platform === 'x' ? '𝕏' : '◎'} 
                    {post.author || '@unknown_creator'}
                 </a>
              </div>

               {/* Model */}
               <div>
                 <h3 className="font-bold text-sm mb-2">Model</h3>
                 <p className="font-medium text-slate-700">{post.model || 'Nano Banana Pro'}</p>
              </div>

               {/* Tags */}
               <div>
                 <h3 className="font-bold text-sm mb-2">Tags</h3>
                 <div className="flex flex-wrap gap-2">
                    {(post.tags || ['Cinematic', 'Realistic', 'High Quality']).map(tag => (
                        <span key={tag} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                            {tag}
                        </span>
                    ))}
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* You Might Also Like */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-8">You might also like</h2>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {relatedPosts.map((p) => (
                <PostCard key={p.id} post={p} onClick={() => onPostClick(p)} />
              ))}
          </div>
        </div>

      </div>
    </div>
  );
};