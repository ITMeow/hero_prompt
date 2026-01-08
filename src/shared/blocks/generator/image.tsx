'use client';

import {
  CreditCard,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import {
  ImageUploader,
  LazyImage,
} from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
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
import { cn } from '@/shared/lib/utils';
import { useImageGenerator, MODEL_OPTIONS, PROVIDER_OPTIONS } from '@/shared/hooks/use-image-generator';

interface ImageGeneratorProps {
  allowMultipleImages?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
  srOnlyTitle?: string;
  className?: string;
  initialPrompt?: string;
}

export function ImageGenerator({
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
    provider,
    setProvider,
    model,
    setModel,
    prompt,
    setPrompt,
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
    <section className={cn('py-16 md:py-24', className)}>
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  {t('title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
                  <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                    <TabsTrigger value="text-to-image">
                      {t('tabs.text-to-image')}
                    </TabsTrigger>
                    <TabsTrigger value="image-to-image">
                      {t('tabs.image-to-image')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-2 gap-4 hidden">
                  <div className="space-y-2">
                    <Label>{t('form.provider')}</Label>
                    <Select
                      value={provider}
                      onValueChange={setProvider}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.select_provider')} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('form.model')}</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.select_model')} />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.filter(
                          (option) =>
                            option.scenes.includes(activeTab) &&
                            option.provider === provider
                        ).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isTextToImageMode && (
                  <div className="space-y-4">
                    <ImageUploader
                      title={t('form.reference_image')}
                      allowMultiple={allowMultipleImages}
                      maxImages={allowMultipleImages ? maxImages : 1}
                      maxSizeMB={maxSizeMB}
                      onChange={setReferenceImageItems}
                      emptyHint={t('form.reference_image_placeholder')}
                    />

                    {hasReferenceUploadError && (
                      <p className="text-destructive text-xs">
                        {t('form.some_images_failed_to_upload')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="image-prompt">{t('form.prompt')}</Label>
                  <Textarea
                    id="image-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('form.prompt_placeholder')}
                    className="min-h-32"
                  />
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {promptLength} / {MAX_PROMPT_LENGTH}
                    </span>
                    {isPromptTooLong && (
                      <span className="text-destructive">
                        {t('form.prompt_too_long')}
                      </span>
                    )}
                  </div>
                </div>

                {!isMounted ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading')}
                  </Button>
                ) : isCheckSign ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('checking_account')}
                  </Button>
                ) : user ? (
                  <Button
                    size="lg"
                    className="w-full"
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

                {!isMounted ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
                    </span>
                    <span>{t('credits_remaining', { credits: 0 })}</span>
                  </div>
                ) : user && remainingCredits > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
                    </span>
                    <span>
                      {t('credits_remaining', { credits: remainingCredits })}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary">
                        {t('credits_cost', { credits: costCredits })}
                      </span>
                      <span>
                        {t('credits_remaining', { credits: remainingCredits })}
                      </span>
                    </div>
                    <Link href="/pricing">
                      <Button variant="outline" className="w-full" size="lg">
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t('buy_credits')}
                      </Button>
                    </Link>
                  </div>
                )}

                {isGenerating && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    {taskStatusLabel && (
                      <p className="text-muted-foreground text-center text-xs">
                        {taskStatusLabel}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <ImageIcon className="h-5 w-5" />
                  {t('generated_images')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                {generatedImages.length > 0 ? (
                  <div
                    className={
                      generatedImages.length === 1
                        ? 'grid grid-cols-1 gap-6'
                        : 'grid gap-6 sm:grid-cols-2'
                    }
                  >
                    {generatedImages.map((image) => (
                      <div key={image.id} className="space-y-3">
                        <div
                          className={
                            generatedImages.length === 1
                              ? 'relative overflow-hidden rounded-lg border'
                              : 'relative aspect-square overflow-hidden rounded-lg border'
                          }
                        >
                          <LazyImage
                            src={image.url}
                            alt={image.prompt || 'Generated image'}
                            className={
                              generatedImages.length === 1
                                ? 'h-auto w-full'
                                : 'h-full w-full object-cover'
                            }
                          />

                          <div className="absolute right-2 bottom-2 flex justify-end text-sm">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto"
                              onClick={() => handleDownloadImage(image)}
                              disabled={downloadingImageId === image.id}
                            >
                              {downloadingImageId === image.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <ImageIcon className="text-muted-foreground h-10 w-10" />
                    </div>
                    <p className="text-muted-foreground">
                      {isGenerating
                        ? t('ready_to_generate')
                        : t('no_images_generated')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
