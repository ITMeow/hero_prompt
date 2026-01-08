'use client';

import {
  CreditCard,
  Download,
  Loader2,
  Sparkles,
  User,
  Image as ImageIconSmall,
  Maximize2
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import {
  ImageUploader,
  LazyImage,
} from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';
import { useImageGenerator } from '@/shared/hooks/use-image-generator';

interface ImageGeneratorProps {
  allowMultipleImages?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
  srOnlyTitle?: string;
  className?: string;
  initialPrompt?: string;
}

export function PlaygroundImageGenerator({
  allowMultipleImages = true,
  maxImages = 9,
  maxSizeMB = 5,
  srOnlyTitle,
  className,
  initialPrompt,
}: ImageGeneratorProps) {
  const t = useTranslations('ai.image.generator');
  
  const {
    activeTab,
    setActiveTab,
    costCredits,
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    setReferenceImageItems,
    generatedImages,
    isGenerating,
    progress,
    taskStatusLabel,
    downloadingImageId,
    isMounted,
    isCheckSign,
    setIsShowSignModal,
    user,
    remainingCredits,
    promptLength,
    isPromptTooLong,
    isTextToImageMode,
    isReferenceUploading,
    hasReferenceUploadError,
    handleGenerate,
    handleDownloadImage,
    MAX_PROMPT_LENGTH,
  } = useImageGenerator({ initialPrompt, allowMultipleImages, maxImages, maxSizeMB });

  return (
    <div className={cn("flex flex-col md:flex-row h-full w-full bg-background overflow-hidden", className)}>
      {/* Left Sidebar - Controls */}
      <div className="w-full md:w-[40%] shrink-0 border-r border-border bg-card flex flex-col h-full z-10">
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t('title') || 'AI Studio'}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('subtitle') || 'Create stunning visuals with AI'}</p>
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('mode_label') || 'Generation Mode'}</Label>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="text-to-image" className="text-xs">{t('tabs.text-to-image')}</TabsTrigger>
                  <TabsTrigger value="image-to-image" className="text-xs">{t('tabs.image-to-image')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Prompt Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <Label htmlFor="playground-prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('form.prompt')}</Label>
                 <span className={cn("text-[10px]", isPromptTooLong ? "text-destructive" : "text-muted-foreground")}>
                    {promptLength}/{MAX_PROMPT_LENGTH}
                 </span>
              </div>
              <Textarea
                id="playground-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('form.prompt_placeholder')}
                className="min-h-[200px] resize-none focus-visible:ring-primary/20 font-medium leading-relaxed"
              />
            </div>

            {/* Image Upload (Conditional) */}
            {!isTextToImageMode && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('form.reference_image')}</Label>
                <div className="rounded-lg border border-dashed border-border p-2 bg-muted/30">
                    <ImageUploader
                      title=""
                      allowMultiple={allowMultipleImages}
                      maxImages={allowMultipleImages ? maxImages : 1}
                      maxSizeMB={maxSizeMB}
                      onChange={setReferenceImageItems}
                      emptyHint={t('form.reference_image_placeholder')}
                      className="min-h-[100px]"
                    />
                </div>
                {hasReferenceUploadError && (
                  <p className="text-destructive text-xs">{t('form.some_images_failed_to_upload')}</p>
                )}
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Action Bar (Fixed at bottom of sidebar) */}
        <div className="p-4 border-t border-border bg-card">
           {!isMounted ? (
              <Button className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('loading')}
              </Button>
            ) : isCheckSign ? (
              <Button className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('checking_account')}
              </Button>
            ) : user ? (
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('credits_cost', { credits: costCredits })}</span>
                    <span>{t('credits_remaining', { credits: remainingCredits })}</span>
                 </div>
                 <Button
                    size="lg"
                    className="w-full font-bold shadow-lg shadow-primary/20"
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      !prompt.trim() ||
                      isPromptTooLong ||
                      isReferenceUploading ||
                      hasReferenceUploadError
                    }
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('generate')}
                      </>
                    )}
                  </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => setIsShowSignModal(true)}
              >
                <User className="mr-2 h-4 w-4" />
                {t('sign_in_to_generate')}
              </Button>
            )}
        </div>
      </div>

      {/* Right Area - Canvas / Results */}
      <div className="flex-1 flex flex-col bg-muted/20 relative">
         {/* Progress Bar Overlay */}
         {isGenerating && (
            <div className="absolute top-0 left-0 right-0 z-20">
               <Progress value={progress} className="h-1 rounded-none" />
            </div>
         )}

         {/* Empty State / Result Display */}
         <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center overflow-y-auto">
             {generatedImages.length > 0 ? (
                 <div className="w-full h-full flex flex-col items-center justify-center min-h-0 p-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className={cn(
                        "w-full max-h-full overflow-y-auto scrollbar-hide flex flex-col items-center",
                        generatedImages.length === 1 ? "h-full justify-center" : "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl"
                    )}>
                        {generatedImages.map((image) => (
                           <div key={image.id} className={cn(
                               "group relative flex items-center justify-center",
                               generatedImages.length === 1 ? "w-full h-full min-h-0 bg-transparent" : "aspect-square rounded-xl overflow-hidden border border-border shadow-sm bg-muted/30"
                           )}>
                               <img
                                  src={image.url}
                                  alt={image.prompt || 'Generated image'}
                                  className={cn(
                                      "transition-transform duration-700",
                                      generatedImages.length === 1 
                                        ? "max-w-full max-h-[calc(100vh-140px)] w-auto h-auto object-contain shadow-2xl rounded-lg" 
                                        : "w-full h-full object-contain bg-black/5"
                                  )}
                               />
                               <div className={cn(
                                   "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]",
                                   generatedImages.length === 1 ? "bg-black/20 rounded-lg" : "bg-black/40"
                               )}>
                                   <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleDownloadImage(image)}
                                      disabled={downloadingImageId === image.id}
                                      className="h-9 px-4 font-medium shadow-lg"
                                   >
                                      {downloadingImageId === image.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                      )}
                                      Download
                                   </Button>
                                   <Button
                                      size="icon"
                                      variant="secondary"
                                      onClick={() => window.open(image.url, '_blank')}
                                      className="h-9 w-9 shadow-lg"
                                   >
                                      <Maximize2 className="h-4 w-4" />
                                   </Button>
                               </div>
                           </div>
                        ))}
                    </div>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center text-center opacity-40 max-w-sm">
                    {isGenerating ? (
                        <div className="flex flex-col items-center gap-4">
                           <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                              <div className="relative bg-background rounded-full p-4 border shadow-sm">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                           </div>
                           <div className="space-y-1">
                              <p className="font-medium text-lg">{t('creating_magic') || 'Creating Magic...'}</p>
                              <p className="text-sm text-muted-foreground">{taskStatusLabel}</p>
                           </div>
                        </div>
                    ) : (
                        <>
                           <div className="bg-muted rounded-2xl p-6 mb-4">
                              <ImageIconSmall className="h-12 w-12 text-muted-foreground" />
                           </div>
                           <h3 className="text-lg font-semibold">{t('ready_to_create') || 'Ready to Create'}</h3>
                           <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                              {t('ready_to_create_desc') || 'Enter a detailed prompt on the sidebar and watch your imagination come to life.'}
                           </p>
                        </>
                    )}
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}