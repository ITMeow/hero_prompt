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
    
    // Massive library of 50 distinct solid/high-saturation Pantone-like colors
    // Reordered for high contrast between sequential items (Red -> Blue -> Green -> ...)
    const colors = [
        // 1-10: High Contrast Primaries & Secondaries
        'bg-red-600 text-white',        // 1
        'bg-blue-600 text-white',       // 2
        'bg-emerald-600 text-white',    // 3
        'bg-orange-500 text-white',     // 4
        'bg-purple-600 text-white',     // 5
        'bg-cyan-600 text-white',       // 6
        'bg-rose-600 text-white',       // 7
        'bg-lime-600 text-white',       // 8
        'bg-indigo-600 text-white',     // 9
        'bg-amber-600 text-white',      // 10

        // 11-20: Distinct Variants
        'bg-teal-600 text-white',       // 11
        'bg-fuchsia-600 text-white',    // 12
        'bg-sky-600 text-white',        // 13
        'bg-violet-600 text-white',     // 14
        'bg-yellow-600 text-white',     // 15
        'bg-slate-600 text-white',      // 16 (Contrast break)
        'bg-pink-500 text-white',       // 17
        'bg-green-600 text-white',      // 18
        'bg-indigo-500 text-white',     // 19
        'bg-orange-600 text-white',     // 20

        // 21-30: Deep & Vibrant
        'bg-blue-700 text-white',       // 21
        'bg-red-500 text-white',        // 22
        'bg-emerald-500 text-white',    // 23
        'bg-purple-500 text-white',     // 24
        'bg-cyan-700 text-white',       // 25
        'bg-rose-500 text-white',       // 26
        'bg-lime-700 text-white',       // 27
        'bg-violet-700 text-white',     // 28
        'bg-amber-700 text-white',      // 29
        'bg-teal-500 text-white',       // 30

        // 31-40: Lighter/Brighter Variants
        'bg-fuchsia-500 text-white',    // 31
        'bg-sky-500 text-white',        // 32
        'bg-stone-600 text-white',      // 33 (Different grey)
        'bg-yellow-700 text-white',     // 34
        'bg-red-700 text-white',        // 35
        'bg-blue-500 text-white',       // 36
        'bg-green-700 text-white',      // 37
        'bg-indigo-400 text-white',     // 38
        'bg-orange-700 text-white',     // 39
        'bg-pink-600 text-white',       // 40

        // 41-50: Remaining Mix
        'bg-teal-700 text-white',       // 41
        'bg-violet-500 text-white',     // 42
        'bg-rose-400 text-white',       // 43
        'bg-cyan-500 text-white',       // 44
        'bg-emerald-700 text-white',    // 45
        'bg-neutral-600 text-white',    // 46 (Another grey)
        'bg-purple-700 text-white',     // 47
        'bg-lime-500 text-white',       // 48
        'bg-fuchsia-700 text-white',    // 49
        'bg-slate-700 text-white'       // 50
    ];

    // Pre-calculate color mappings to ensure uniqueness within this text block
    const idToColorMap = new Map<string, string>();
    const uniqueIds = new Set<string>();
    
    // First pass: Find all unique IDs
    let match;
    // We use a new RegExp with global flag to iterate
    const scannerRegex = new RegExp(variableRegex);
    let scanContent = displayContent;
    
    // Simple matchAll extraction
    const matches = scanContent.matchAll(variableRegex);
    for (const m of matches) {
        const variableName = m[1];
        const parts = variableName.trim().split('|');
        if (parts.length === 3) {
            uniqueIds.add(parts[0].trim());
        } else {
            uniqueIds.add(variableName.trim());
        }
    }

    // Assign unique colors sequentially from the shuffled palette
    // To make it deterministic for the same set of IDs, we sort them first
    const sortedIds = Array.from(uniqueIds).sort();
    sortedIds.forEach((id, index) => {
        // Cycle through colors if we have more IDs than colors (unlikely with 50 colors)
        idToColorMap.set(id, colors[index % colors.length]);
    });

    const processedText = displayContent.replace(variableRegex, (match, variableName) => {
        // Check for new format: {{ RelationID|Key|Value }}
        const cleanVariableName = variableName.trim();
        const parts = cleanVariableName.split('|');
        let relationId = cleanVariableName;
        let displayName = cleanVariableName;
        let isFormatted = false;

        if (parts.length === 3) {
            relationId = parts[0].trim();
            // key = parts[1].trim(); // Unused for display/color
            displayName = parts[2].trim();
            isFormatted = true;
        }

        // Retrieve the pre-assigned unique color
        const colorClass = idToColorMap.get(relationId) || colors[0];
        
        // Render the badge with ID if formatted, otherwise standard pill
        if (isFormatted) {
            return `<span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105 shadow-sm" style="vertical-align: baseline;">
                <span class="bg-white/20 text-white/90 px-1 rounded-sm text-[10px] mr-1.5 min-w-[1.2em] text-center font-mono leading-tight flex items-center justify-center h-4">${relationId}</span>
                <span class="truncate max-w-[300px]">${displayName}</span>
            </span>`;
        } else {
             // Fallback for non-formatted variables (legacy support)
            return `<span class="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105" style="vertical-align: baseline;">${displayName}</span>`;
        }
    });

    if (isJson) {
        return `<pre class="whitespace-pre-wrap font-mono text-sm bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300">${processedText}</pre>`;
    }

    // For Markdown:
    return md.render(processedText);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 h-10 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-4 sm:gap-0 z-10">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center h-full">
                
                {/* Custom Segmented Control - Minimalist */}
                <div className="flex items-center p-0.5 bg-muted/50 rounded-lg h-8 w-full sm:w-[240px]">
                    <button
                        onClick={() => setMode('preview')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-medium rounded-[6px] transition-all h-full",
                            mode === 'preview' 
                                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {t('preview_interaction') || 'Preview'}
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-medium rounded-[6px] transition-all h-full",
                            mode === 'edit' 
                                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        {t('edit_template') || 'Edit Code'}
                    </button>
                </div>
                
                {onTranslate && (
                    <div className="hidden sm:block h-4 w-px bg-border/60 mx-2"></div>
                )}

                {onTranslate && (
                        <Button
                        variant={isTranslated ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2 w-full sm:w-auto h-7 text-xs font-medium text-muted-foreground hover:text-foreground"
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
                    {hasCopied ? (t('copied') || 'Copied') : (t('copy_result') || 'Copy')}
                </Button>

                {onToggleRightPanel && !showRightPanel && (
                    <>
                        <div className="hidden sm:block h-4 w-px bg-border/60 mx-2"></div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRightPanel}
                            title="Open Sidebar"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                            <PanelRightOpen className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>
        </div>

        {/* Content Area - Single Card Layer */}
        <div className="flex-1 relative min-h-[500px] bg-slate-100/60 dark:bg-black/40">
            {mode === 'preview' ? (
                <ScrollArea className="flex-1 h-full w-full">
                    <div className="flex flex-col items-center min-h-full p-4 sm:p-8">
                        <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300">
                            {/* The Card - No Border, Just Surface */}
                            <div className="
                                bg-white dark:bg-zinc-900
                                rounded-xl 
                                shadow-sm
                                p-8 sm:p-12
                                min-h-[60vh]
                            ">
                                <div 
                                    ref={contentRef}
                                    className="
                                        prose prose-lg prose-slate dark:prose-invert max-w-none 
                                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                                        prose-p:leading-[2] prose-p:text-slate-600 dark:prose-p:text-slate-300
                                        prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-bold
                                        prose-li:text-slate-600 dark:prose-li:text-slate-300
                                        marker:text-slate-400
                                    "
                                    dangerouslySetInnerHTML={{ __html: renderContent(content) }}
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            ) : (
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 w-full h-full resize-none border-0 rounded-none p-8 font-mono text-sm focus-visible:ring-0 leading-relaxed bg-transparent"
                    placeholder="Enter your prompt here..."
                />
            )}
        </div>
    </div>
  );
};