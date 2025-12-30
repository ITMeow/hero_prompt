import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { tagTranslator, type Language } from '@/shared/lib/tagTranslator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import { SocialPost } from '../lib/types';
import { PostCard } from './PostCard';
import { PromptEditor } from './PromptEditor';

interface PostDetailProps {
  post: SocialPost;
  relatedPosts: SocialPost[];
  onBack: () => void;
  onPostClick: (post: SocialPost) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  post,
  relatedPosts,
  onBack,
  onPostClick,
}) => {
  const router = useRouter();
  const t = useTranslations('social.landing');
  const locale = useLocale();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);

  // Determine current language
  const currentLanguage: Language = locale === 'en' ? 'en' : 'zh-CN';
  // Get the opposite language for translation toggle
  const translatedLanguage: Language = currentLanguage === 'zh-CN' ? 'en' : 'zh-CN';

  // Get current content
  const currentContent = isTranslated && post.i18nContent
    ? post.i18nContent[translatedLanguage].prompt
    : post.prompt || post.description;

  const handleTryThis = () => {
    // Save to sessionStorage to avoid URL length limits
    sessionStorage.setItem('ai_generator_prompt', currentContent || '');
    router.push(`/${locale}/ai-image-generator`);
  };

  // Basic detection if content is JSON
  const isJsonContent = (text: string | null | undefined): boolean => {
    if (!text) return false;
    try {
        const trimmed = text.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
             JSON.parse(trimmed);
             return true;
        }
    } catch (e) {
        return false;
    }
    return false;
  };

  return (
    <div className="dark:bg-background dark:text-foreground h-full w-full bg-white flex flex-col font-[family-name:var(--font-manrope)] text-slate-900 overflow-hidden">
      
      <div className="flex-1 w-full px-4 py-4 md:px-6 lg:px-8 min-h-0">
        {/* Main Grid Layout - 3 Column Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6 h-full">
          
          {/* Left Column - Panel */}
          <div className="lg:col-span-3 flex flex-col h-full bg-white dark:bg-muted/10 rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center px-3 h-14 shrink-0 border-b bg-muted/20">
               <button
                  onClick={onBack}
                  className="dark:text-muted-foreground dark:hover:text-foreground flex w-full items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 hover:bg-black/5 dark:hover:bg-white/5 rounded-md px-2 py-1.5"
                >
                  <ArrowLeft size={16} className="mr-2" /> {t('back_to_gallery')}
                </button>
            </div>
            
            {/* Panel Body */}
            <div className="flex-1 min-h-0 relative">
               <ScrollArea className="h-full">
                  <div className="p-4 flex flex-col gap-6">
                    {/* Image Section */}
                    <section className="text-center">
                      <button
                        type="button"
                        className="group focus:ring-primary dark:bg-transparent relative flex w-full cursor-zoom-in justify-center overflow-hidden rounded-xl border-0 bg-transparent p-0 focus:ring-2 focus:outline-none"
                        style={{
                          height: 'auto',
                          contain: 'layout style',
                        }}
                        onClick={() => setSelectedImage(post.imageUrl)}
                      >
                        <img
                          alt={post.title}
                          fetchPriority="high"
                          className="h-auto w-auto max-w-full rounded-xl object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                          src={post.imageUrl}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 rounded-xl">
                          <div className="bg-background/80 rounded-full p-3 shadow-lg backdrop-blur-md">
                            <ZoomIn size={24} className="text-foreground" />
                          </div>
                        </div>
                      </button>
                    </section>

                    {/* Title */}
                    <h1 className="dark:text-foreground text-xl leading-tight font-extrabold text-slate-900 text-left">
                      {post.title}
                    </h1>

                    {/* Author & Stats */}
                    <div className="flex flex-col gap-4">
                      {/* Author Row */}
                      <div className="flex items-center flex-wrap gap-3">
                        {post.authorAvatar ? (
                            <img
                              src={post.authorAvatar}
                              alt={post.authorDisplayName || 'Author'}
                              className="ring-border h-8 w-8 rounded-full object-cover shadow-sm ring-1"
                            />
                          ) : (
                            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm">
                              {post.authorDisplayName
                                ? post.authorDisplayName[0]?.toUpperCase()
                                : post.author
                                  ? post.author[0]?.toUpperCase()
                                  : 'U'}
                            </div>
                          )}
                          
                          <div className="flex flex-col">
                              <span className="dark:text-foreground font-semibold text-slate-900 text-sm">
                                {post.authorDisplayName || post.author || 'Unknown'}
                              </span>
                              {post.sourceUrl && (
                                  <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-3 w-3" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.6874 3.0625L12.6907 8.77425L8.37045 3.0625H2.11328L9.58961 12.8387L2.50378 20.9375H5.53795L11.0068 14.6886L15.7863 20.9375H21.8885L14.095 10.6342L20.7198 3.0625H17.6874ZM16.6232 19.1225L5.65436 4.78217H7.45745L18.3034 19.1225H16.6232Z"></path>
                                    </svg>
                                    {t('source')}
                                  </a>
                              )}
                          </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Likes">
                                <Heart size={16} />
                                <span className="font-medium">{post.stats.likes}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Comments">
                                <MessageCircle size={16} />
                                <span className="font-medium">{post.stats.comments || '0'}</span>
                            </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tagKey) => (
                          <span
                            key={tagKey}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {tagTranslator.translate(tagKey, currentLanguage)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleTryThis}
                        className="w-full focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center gap-2 rounded-md px-6 py-2 text-sm font-medium shadow-sm transition-all focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        {t('try_this')}
                      </button>
                    </div>

                    {/* Reference Images */}
                    {post.referenceImageUrl && (
                      <div className="mt-2">
                        <p className="text-muted-foreground mb-2 text-sm font-medium">
                          {t('reference_images')}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {post.referenceImageUrl.split(',').map((url, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImage(url.trim())}
                              className="aspect-square border-border hover:ring-primary dark:bg-muted relative cursor-pointer overflow-hidden rounded-lg border bg-gray-100 transition-all hover:ring-2"
                            >
                              <img
                                alt={`Reference ${index + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover"
                                src={url.trim()}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
               </ScrollArea>
            </div>
          </div>

          {/* Middle Column - Prompt Editor (6 cols) */}
          <div className="lg:col-span-6 flex flex-col h-full lg:overflow-hidden">
             <PromptEditor 
                initialContent={currentContent || ''} 
                isJson={isJsonContent(currentContent)}
                onTranslate={() => setIsTranslated(!isTranslated)}
                isTranslated={isTranslated}
             />
          </div>

          {/* Right Column - Panel */}
          <div className="lg:col-span-3 hidden lg:flex flex-col h-full bg-white dark:bg-muted/10 rounded-xl border border-border shadow-sm overflow-hidden">
             {/* Panel Header */}
             <div className="flex items-center px-4 h-14 shrink-0 border-b bg-muted/20">
                <span className="text-sm font-semibold text-foreground">{t('you_might_like')}</span>
             </div>
             
             {/* Panel Body */}
             <div className="flex-1 min-h-0 relative">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-6">
                        {/* Placeholder for future widgets */}
                        <div className="rounded-lg border border-dashed border-border p-4 min-h-[100px] flex items-center justify-center text-muted-foreground text-sm bg-muted/5">
                            <p>Recommended & Ads Space</p>
                        </div>

                        {/* Related Posts */}
                        <div className="flex flex-col gap-4">
                            {relatedPosts.map((p) => (
                              <PostCard key={p.id} post={p} onClick={() => onPostClick(p)} />
                            ))}
                        </div>
                    </div>
                </ScrollArea>
             </div>
          </div>

        </div>
      </div>

      {/* Image Zoom Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent
          className="!m-0 !h-screen !max-h-none !w-screen !max-w-none border-none bg-transparent !p-0 shadow-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Zoomed Image</DialogTitle>

          {/* Custom Close Button */}
          <DialogClose className="absolute top-8 right-8 z-50 cursor-pointer rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition-all outline-none hover:bg-black/40">
            <X size={32} />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div
            className="pointer-events-none relative flex h-full w-full items-center justify-center"
            onClick={() => setSelectedImage(null)}
          >
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="pointer-events-auto h-[90vh] w-[90vw] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
