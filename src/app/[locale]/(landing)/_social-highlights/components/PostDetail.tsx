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

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import { SocialPost } from '../lib/types';
import { PostCard } from './PostCard';

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

  const handleTryThis = () => {
    // Get the prompt in the currently displayed language
    const text = isTranslated && post.i18nContent
      ? post.i18nContent[translatedLanguage].prompt
      : post.prompt;
    
    // Save to sessionStorage to avoid URL length limits
    sessionStorage.setItem('ai_generator_prompt', text);
    router.push(`/${locale}/ai-image-generator`);
  };

  return (
    <div className="dark:bg-background dark:text-foreground min-h-screen bg-white pt-20 font-[family-name:var(--font-manrope)] text-slate-900">
      {/* Top Nav */}
      <div className="container mx-auto px-4 pt-6 pb-4 sm:px-6">
        <button
          onClick={onBack}
          className="dark:text-muted-foreground dark:hover:text-foreground flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={18} className="mr-2" /> {t('back_to_gallery')}
        </button>
      </div>

      <div className="container mx-auto px-4 pb-20 sm:px-6">
        {/* Main Grid Layout */}
        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Left Column - Image (7 cols) */}
          <div className="lg:col-span-7" style={{ contain: 'layout' }}>
            <section className="text-center">
              <button
                type="button"
                className="group focus:ring-primary dark:bg-transparent relative flex w-full cursor-zoom-in justify-center overflow-hidden rounded-2xl border-0 bg-transparent p-0 focus:ring-2 focus:outline-none"
                style={{
                  maxHeight: '80vh',
                  height: 'auto',
                  contain: 'layout style',
                }}
                onClick={() => setSelectedImage(post.imageUrl)}
              >
                <img
                  alt={post.title}
                  fetchPriority="high"
                  className="h-auto max-h-[80vh] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  src={post.imageUrl}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                  <div className="bg-background/80 rounded-full p-3 shadow-lg backdrop-blur-md">
                    <ZoomIn size={24} className="text-foreground" />
                  </div>
                </div>
              </button>
            </section>

            <h1 className="dark:text-foreground mb-4 mt-6 text-3xl leading-tight font-extrabold text-slate-900 md:text-4xl">
              {post.title}
            </h1>
          </div>

          {/* Right Column - Details (5 cols) */}
          <div className="flex flex-col lg:col-span-5">
            {/* Author & Stats Row */}
            <div className="dark:text-muted-foreground mb-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
              {/* Author */}
              <div className="flex items-center gap-2">
                {/* Avatar */}
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

                {/* Display Name */}
                {(post.authorDisplayName || post.author) && (
                  <span className="dark:text-foreground font-semibold text-slate-900">
                    {post.authorDisplayName || post.author}
                  </span>
                )}

                {/* Source Link */}
                <a
                  href={post.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <span
                    data-slot="badge"
                    className="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground hover:bg-secondary inline-flex w-fit shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3"
                  >
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 24 24"
                      className="mr-1 h-3 w-3"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.6874 3.0625L12.6907 8.77425L8.37045 3.0625H2.11328L9.58961 12.8387L2.50378 20.9375H5.53795L11.0068 14.6886L15.7863 20.9375H21.8885L14.095 10.6342L20.7198 3.0625H17.6874ZM16.6232 19.1225L5.65436 4.78217H7.45745L18.3034 19.1225H16.6232Z"></path>
                    </svg>
                    Source
                  </span>
                </a>
              </div>

              <div className="dark:bg-border mx-2 hidden h-4 w-px bg-gray-300 sm:block"></div>

              {/* Likes */}
              <div className="flex items-center gap-1.5" title="Likes">
                <Heart size={18} className="text-gray-400" />
                <span className="font-medium">{post.stats.likes}</span>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-1.5" title="Comments">
                <MessageCircle size={18} className="text-gray-400" />
                <span className="font-medium">
                  {post.stats.comments || '0'}
                </span>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {post.tags.map((tagKey) => (
                  <span
                    key={tagKey}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-primary text-primary-foreground dark:bg-primary/20 dark:text-primary"
                  >
                    {tagTranslator.translate(tagKey, currentLanguage)}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mb-8 flex items-center gap-3">
              <button
                onClick={handleTryThis}
                data-slot="button"
                className="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-6 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-all outline-none focus-visible:ring-[3px] active:scale-95 disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t('try_this')}
              </button>

              <button
                onClick={() => setIsTranslated(!isTranslated)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-all ${isTranslated ? 'bg-secondary text-secondary-foreground border-transparent' : 'bg-background border-input hover:bg-accent hover:text-accent-foreground'}`}
              >
                {isTranslated ? t('translated') : t('translate')}
              </button>
            </div>

            {/* Prompt Section - Fixed Height & Scrollable */}
            <div className="space-y-4">
              <div className="dark:bg-muted/30 dark:border-border custom-scrollbar h-[400px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="prose prose-sm dark:text-muted-foreground max-w-none leading-relaxed font-medium whitespace-pre-line text-slate-700">
                  {isTranslated && post.i18nContent
                    ? post.i18nContent[translatedLanguage].prompt || t('no_prompt_desc')
                    : post.prompt || post.description}
                  {!post.prompt &&
                    !isTranslated &&
                    `\n\n${t('no_prompt_desc')}`}
                </div>
              </div>
            </div>

            {/* Reference Images */}
            {post.referenceImageUrl && (
              <div className="mt-6 text-left">
                <p className="text-muted-foreground mb-2 text-sm font-medium">
                  {t('reference_images')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.referenceImageUrl.split(',').map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(url.trim())}
                      className="border-border hover:ring-primary dark:bg-muted relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border bg-gray-100 transition-all hover:ring-2"
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
        </div>

        {/* You Might Also Like */}
        <div className="mt-24">
          <h2 className="mb-8 text-2xl font-bold">{t('you_might_like')}</h2>
          <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
            {relatedPosts.map((p) => (
              <PostCard key={p.id} post={p} onClick={() => onPostClick(p)} />
            ))}
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
