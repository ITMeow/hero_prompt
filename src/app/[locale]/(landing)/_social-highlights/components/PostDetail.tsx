import React, { useState } from 'react';
import { ArrowLeft, Copy, Heart, MessageCircle, ExternalLink, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslations } from 'next-intl';
import { SocialPost } from '../lib/types';
import { PostCard } from './PostCard';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';

interface PostDetailProps {
  post: SocialPost;
  relatedPosts: SocialPost[];
  onBack: () => void;
  onPostClick: (post: SocialPost) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, relatedPosts, onBack, onPostClick }) => {
  const t = useTranslations('social.landing');
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleCopyPrompt = () => {
    const text = post.prompt || post.description;
    navigator.clipboard.writeText(text);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background pt-20 font-[family-name:var(--font-manrope)] text-slate-900 dark:text-foreground">
      {/* Top Nav */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors font-medium text-sm"
        >
          <ArrowLeft size={18} className="mr-2" /> {t('back_to_gallery')}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column - Image */}
          <div className="flex flex-col gap-6">
            <div className="rounded-[24px] p-1 border border-gray-200 dark:border-border shadow-lg bg-white dark:bg-card cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setSelectedImage(post.imageUrl)}>
               <div className="relative rounded-[20px] overflow-hidden bg-gray-50 dark:bg-muted w-full flex justify-center items-center">
                 <img
                   src={post.imageUrl}
                   alt={post.title}
                   className="w-auto h-auto max-w-full max-h-[80vh] object-contain"
                 />
               </div>
            </div>
            
            {/* Reference Images */}
            <div className="mt-4">
              <p className="text-muted-foreground mb-2 text-sm">{t('reference_images')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedImage(post.referenceImageUrl || "https://cdn.bananaprompts.fun/prompts/GAS_dyoU4ZXa40EPCssHp.webp")}
                  className="border-border hover:ring-primary relative h-16 w-16 overflow-hidden rounded-xl border transition-all hover:ring-2 cursor-pointer"
                >
                  <img
                    alt="Reference 1"
                    loading="lazy"
                    decoding="async"
                    className="object-cover absolute inset-0 h-full w-full text-transparent"
                    src={post.referenceImageUrl || "https://cdn.bananaprompts.fun/prompts/GAS_dyoU4ZXa40EPCssHp.webp"}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-foreground mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Author & Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 dark:text-muted-foreground">
               {/* Author */}
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-slate-900 font-bold text-[10px] shadow-sm">
                    {post.author ? post.author[1]?.toUpperCase() : 'U'}
                  </div>
                  {/* Source Link */}
                  <a 
                    href={post.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2"
                  >
                      <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground hover:bg-secondary cursor-pointer transition-colors">
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="mr-1 h-3 w-3" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.6874 3.0625L12.6907 8.77425L8.37045 3.0625H2.11328L9.58961 12.8387L2.50378 20.9375H5.53795L11.0068 14.6886L15.7863 20.9375H21.8885L14.095 10.6342L20.7198 3.0625H17.6874ZM16.6232 19.1225L5.65436 4.78217H7.45745L18.3034 19.1225H16.6232Z"></path>
                        </svg>
                        {post.author || t('source')}
                      </span>
                  </a>
               </div>
               
               <div className="w-px h-4 bg-gray-300 dark:bg-border mx-2 hidden sm:block"></div>

               {/* Likes */}
               <div className="flex items-center gap-1.5" title="Likes">
                  <Heart size={18} className="text-gray-400" />
                  <span className="font-medium">{post.stats.likes}</span>
               </div>

               {/* Comments */}
               <div className="flex items-center gap-1.5" title="Comments">
                  <MessageCircle size={18} className="text-gray-400" />
                  <span className="font-medium">{post.stats.comments || '0'}</span>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={handleCopyPrompt}
                data-slot="button"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 h-9 px-4 py-2 has-[>svg]:px-3 flex-1 gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? t('copied') : t('copy_prompt')}
              </button>
            </div>

            {/* Prompt Section */}
            <div className="bg-gray-50 dark:bg-muted/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-border">
              <div className="prose prose-sm text-slate-700 dark:text-muted-foreground max-w-none font-medium leading-relaxed whitespace-pre-line">
                {post.prompt ? post.prompt : post.description}
                {!post.prompt && `\n\n${t('no_prompt_desc')}`}
              </div>
            </div>

          </div>
        </div>

        {/* You Might Also Like */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-8">{t('you_might_like')}</h2>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {relatedPosts.map((p) => (
                <PostCard key={p.id} post={p} onClick={() => onPostClick(p)} />
              ))}
          </div>
        </div>

      </div>

      {/* Image Zoom Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 overflow-hidden border border-gray-200 dark:border-border bg-white dark:bg-card">
          <div className="relative w-full h-full flex items-center justify-center bg-gray-50 dark:bg-muted rounded-lg overflow-hidden">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
