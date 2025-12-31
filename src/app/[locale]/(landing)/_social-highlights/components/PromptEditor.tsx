import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { Copy, Check, Edit2, Eye, Languages, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';

interface PromptEditorProps {
  initialContent: string;
  isJson?: boolean;
  onTranslate?: () => void;
  isTranslated?: boolean;
  onToggleRightPanel?: () => void;
  showRightPanel?: boolean;
}

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export const PromptEditor: React.FC<PromptEditorProps> = ({
  initialContent,
  isJson = false,
  onTranslate,
  isTranslated = false,
  onToggleRightPanel,
  showRightPanel = true,
}) => {
  const t = useTranslations('social.landing');
  const [content, setContent] = useState(initialContent);
  const [hasCopied, setHasCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Update content when initialContent changes (e.g., translation toggle)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setHasCopied(true);
      toast.success(t('copied') || 'Copied to clipboard');
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy');
    }
  };

  // Function to render content with variable highlighting
  const renderContent = (text: string) => {
    if (!text) return '';

    // If JSON, try to format it
    let displayContent = text;
    if (isJson) {
      try {
        const jsonObj = JSON.parse(text);
        displayContent = JSON.stringify(jsonObj, null, 2);
      } catch (e) {
        // Fallback to raw text if parse fails
      }
    }

    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    // Define a set of colors for variables
    const colors = [
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ];

    const processedText = displayContent.replace(variableRegex, (match, variableName) => {
        // Simple hash to pick a color
        let hash = 0;
        for (let i = 0; i < variableName.length; i++) {
            hash = variableName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colors.length;
        const colorClass = colors[colorIndex];
        
        return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${colorClass} mx-0.5 my-0.5 align-baseline" style="vertical-align: baseline;">${variableName}</span>`;
    });

    if (isJson) {
        return `<pre class="whitespace-pre-wrap font-mono text-sm">${processedText}</pre>`;
    }

    // For Markdown:
    return md.render(processedText);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 h-10 shrink-0 border-b bg-muted/20 gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center h-full">
                
                {/* Custom Segmented Control */}
                <div className="flex items-center p-1 bg-muted rounded-lg h-8 w-full sm:w-[240px]">
                    <button
                        onClick={() => setMode('preview')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-medium rounded-md transition-all h-full",
                            mode === 'preview' 
                                ? "bg-background text-foreground shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {t('preview_interaction') || 'Preview'}
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-medium rounded-md transition-all h-full",
                            mode === 'edit' 
                                ? "bg-background text-foreground shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        {t('edit_template') || 'Edit Code'}
                    </button>
                </div>
                
                {onTranslate && (
                    <div className="hidden sm:block h-6 w-px bg-border mx-2"></div>
                )}

                {onTranslate && (
                        <Button
                        variant={isTranslated ? "secondary" : "outline"}
                        size="sm"
                        className="gap-2 w-full sm:w-auto h-7 text-xs"
                        onClick={onTranslate}
                        >
                        <Languages className="w-3.5 h-3.5" />
                        {isTranslated ? t('translated') : t('translate')}
                        </Button>
                )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <Button 
                    variant="default"
                    size="sm"
                    className="gap-2 flex-1 sm:flex-none h-7 text-xs"
                    onClick={handleCopy}
                >
                    {hasCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {t('copy_result') || 'Copy'}
                </Button>

                {onToggleRightPanel && !showRightPanel && (
                    <>
                        <div className="hidden sm:block h-6 w-px bg-border mx-2"></div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRightPanel}
                            title="Open Sidebar"
                            className="h-7 w-7"
                        >
                            <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative min-h-[500px] bg-background">
            {mode === 'preview' ? (
                <ScrollArea className="flex-1 h-full w-full">
                    <div 
                        ref={contentRef}
                        className="p-6 prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border"
                        dangerouslySetInnerHTML={{ __html: renderContent(content) }}
                    />
                </ScrollArea>
            ) : (
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 w-full h-full resize-none border-0 rounded-none p-6 font-mono text-sm focus-visible:ring-0"
                    placeholder="Enter your prompt here..."
                />
            )}
        </div>
    </div>
  );
};