'use client';

import React, { useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Sparkles,
  X,
  ZoomIn,
  PanelRightClose
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

import { PlaygroundImageGenerator } from '@/shared/blocks/generator';

import { SocialPost } from '../lib/types';
import { PostCard } from './PostCard';
import { PromptEditor } from './PromptEditor';
import { isJsonContent, getFixedContent, processPromptContent } from '../lib/utils';

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
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [currentPromptContent, setCurrentPromptContent] = useState('');
    const [showGenerator, setShowGenerator] = useState(false);
  
    // Determine current language
    const currentLanguage: Language = locale === 'en' ? 'en' : 'zh-CN';
    // Get the opposite language for translation toggle
    const translatedLanguage: Language = currentLanguage === 'zh-CN' ? 'en' : 'zh-CN';
  
    // Get current content
    const currentContent = isTranslated && post.i18nContent
      ? post.i18nContent[translatedLanguage].prompt
      : post.prompt || post.description;
  
    const fixedContent = getFixedContent(currentContent || '');
  
    const handleTryThis = () => {
      setShowGenerator(true);
    };
  
    const getProcessedPrompt = () => {
        const textToProcess = currentPromptContent || fixedContent;
        return processPromptContent(textToProcess);
    };
  
    const PostInfoPanel = () => (
      <div className="p-4 flex flex-col gap-6">
        {/* Image Section */}
        <section className="text-center">
          <button
            type="button"
            className="group focus:ring-primary dark:bg-transparent relative flex w-full cursor-zoom-in justify-center overflow-hidden rounded-lg border-0 bg-transparent p-0 focus:ring-2 focus:outline-none"
            style={{
              height: 'auto',
              contain: 'layout style',
            }}
            onClick={() => setSelectedImage(post.imageUrl)}
          >
            <img
              alt={post.title}
              fetchPriority="high"
              className="h-auto w-auto max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              src={post.imageUrl}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 rounded-lg">
              <div className="bg-background/80 rounded-full p-2 shadow-lg backdrop-blur-md">
                <ZoomIn size={20} className="text-foreground" />
              </div>
            </div>
          </button>
        </section>
  
        {/* Reference Images */}
        {post.referenceImageUrl && (
          <div className="mt-2">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              {t('reference_images')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {post.referenceImageUrl.split(',').map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(url.trim())}
                  className="aspect-square border-border hover:ring-primary dark:bg-muted relative cursor-pointer overflow-hidden rounded border bg-gray-100 transition-all hover:ring-2"
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
  
        {/* Title */}
        <h1 className="dark:text-foreground text-lg leading-tight font-bold text-slate-900 text-left">
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
                  className="ring-border h-6 w-6 rounded-full object-cover shadow-sm ring-1"
                />
              ) : (
                <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                  {post.authorDisplayName
                    ? post.authorDisplayName[0]?.toUpperCase()
                    : post.author
                      ? post.author[0]?.toUpperCase()
                      : 'U'}
                </div>
              )}
              
              <div className="flex flex-col">
                  <span className="dark:text-foreground font-semibold text-slate-900 text-xs">
                    {post.authorDisplayName || post.author || 'Unknown'}
                  </span>
                  {post.sourceUrl && (
                      <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-3 w-3" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.6874 3.0625L12.6907 8.77425L8.37045 3.0625H2.11328L9.58961 12.8387L2.50378 20.9375H5.53795L11.0068 14.6886L15.7863 20.9375H21.8885L14.095 10.6342L20.7198 3.0625H17.6874ZM16.6232 19.1225L5.65436 4.78217H7.45745L18.3034 19.1225H16.6232Z"></path>
                        </svg>
                        {t('source')}
                      </a>
                  )}
              </div>
          </div>
  
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5" title="Likes">
                    <Heart size={14} />
                    <span className="font-medium">{post.stats.likes}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Comments">
                    <MessageCircle size={14} />
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
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
              >
                {tagTranslator.translate(tagKey, currentLanguage)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  
    return (
      <div className="dark:bg-background dark:text-foreground h-full w-full bg-background flex flex-col font-[family-name:var(--font-manrope)] text-slate-900 overflow-y-auto md:overflow-hidden">
        
        <div className="flex-1 w-full min-h-0">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-auto md:h-full">
            
            {/* Left Column - Panel */}
            <div className="md:col-span-4 lg:col-span-3 flex flex-col h-auto md:h-full bg-background border-b md:border-b-0 md:border-r border-border overflow-hidden shrink-0">
              {/* Panel Header */}
              <div className="flex items-center px-4 h-10 shrink-0 border-b border-border bg-muted/20 gap-3">
                 <button
                   onClick={onBack}
                   className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                 >
                   <ArrowLeft size={14} />
                 </button>
                 <button 
                   onClick={onBack}
                   className="text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
                 >
                   {t('back_to_gallery')}
                 </button>
              </div>
              
              {/* Panel Body */}
              <div className="flex-1 min-h-0 relative">
                 {/* Mobile: Natural flow (No ScrollArea) */}
                 <div className="block md:hidden">
                   <PostInfoPanel />
                 </div>
                 
                 {/* Desktop: ScrollArea */}
                 <div className="hidden md:block h-full">
                   <ScrollArea className="h-full">
                      <PostInfoPanel />
                   </ScrollArea>
                 </div>
              </div>
            </div>
  
            {/* Middle Column - Prompt Editor */}
            <div className={`
              ${showRightPanel ? 'xl:col-span-6' : 'xl:col-span-9'} 
              md:col-span-8 lg:col-span-9
              flex flex-col h-[600px] md:h-full lg:overflow-hidden bg-background transition-all duration-300
            `}>
               <PromptEditor
                  initialContent={fixedContent}
                  isJson={isJsonContent(currentContent)}
                  onTranslate={() => setIsTranslated(!isTranslated)}
                  isTranslated={isTranslated}
                  showRightPanel={showRightPanel}
                  onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
                  activeLanguage={isTranslated ? translatedLanguage : currentLanguage}
                  onChange={setCurrentPromptContent}
                  onTryItNow={handleTryThis}
               />
            </div>
  
            {/* Right Column - Panel (Collapsed on PAD/Tablet, Visible on XL) */}
            {showRightPanel && (
              <div className="xl:col-span-3 hidden xl:flex flex-col h-full bg-background border-l border-border overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('you_might_like')}</span>
                    <button
                      onClick={() => setShowRightPanel(false)}
                      className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                      title="Close Sidebar"
                    >
                      <PanelRightClose size={16} />
                    </button>
                </div>
                
                {/* Panel Body */}
                <div className="flex-1 min-h-0 relative">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {/* Placeholder for future widgets */}
                            <div className="rounded border border-dashed border-border p-4 min-h-[100px] flex items-center justify-center text-muted-foreground text-xs bg-muted/5">
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
            )}
  
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
  
                                                  {/* Generator Dialog */}
  
                                                  <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
  
                                                    <DialogContent className="sm:max-w-[96vw] w-full h-[96vh] p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl gap-0">
  
                                                        <DialogTitle className="sr-only">{t('try_this')}</DialogTitle>
  
                                                        <div className="flex-1 w-full h-full relative">
  
                                                            {showGenerator && (
  
                                                                <PlaygroundImageGenerator 
  
                                                                    initialPrompt={getProcessedPrompt()} 
  
                                                                    className="h-full w-full" 
  
                                                                />
  
                                                            )}
  
                                                        </div>
  
                                                    </DialogContent>
  
                                                  </Dialog>
  
                                            
  
                                      
  
                                
  
                          
  
                    
  
              
  
        
      </div>
    );
  };
  