import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { Copy, Check, Edit2, Eye, Languages, PanelRightClose, PanelRightOpen, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { Kbd } from '@/shared/components/ui/kbd';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';

interface PromptEditorProps {
  initialContent: string;
  isJson?: boolean;
  onTranslate?: () => void;
  isTranslated?: boolean;
  onToggleRightPanel?: () => void;
  showRightPanel?: boolean;
  activeLanguage?: 'en' | 'zh-CN';
}

interface VariableOption {
  id: string;
  cn: string;
  en: string;
}

interface ActiveVariableState {
  index: number;
  category: string;
  id?: string; // The ID part of the variable (e.g. "4" in {{ 4|lighting|... }})
  originalText: string;
  rect: DOMRect;
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
  activeLanguage = 'en',
}) => {
  const t = useTranslations('social.landing');
  const [content, setContent] = useState(initialContent);
  const [hasCopied, setHasCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Interactive Variable State
  const [activeVariable, setActiveVariable] = useState<ActiveVariableState | null>(null);
  const [variableOptions, setVariableOptions] = useState<VariableOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Cache for variable options to enable instant loading
  const variableCache = useRef<Record<string, VariableOption[]>>({});
  // Cache for default values: maps variable ID (or category) to its default value
  const defaultValuesCache = useRef<Record<string, string>>({});

  // Update content when initialContent changes (e.g., translation toggle)
  useEffect(() => {
    setContent(initialContent);
    
    // Pre-fetch variable options and extract default values
    const preFetchVariables = async () => {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const matches = initialContent.matchAll(variableRegex);
        const categoriesToFetch = new Set<string>();

        for (const m of matches) {
            const cleanContent = m[1].trim();
            const parts = cleanContent.split('|');
            let category = '';
            let id = '';
            let defaultValue = '';

            if (parts.length === 3) {
                 // Format: {{ id|category|defaultValue }}
                 id = parts[0].trim();
                 category = parts[1].trim();
                 defaultValue = parts[2].trim();
                 // Store default value using ID as key
                 if (id && defaultValue) {
                     defaultValuesCache.current[id] = defaultValue;
                 }
            } else if (parts.length === 2) {
                 // Format: {{ category|defaultValue }}
                 category = parts[0].trim();
                 defaultValue = parts[1].trim();
                 // Store default value using category as key
                 if (category && defaultValue) {
                     defaultValuesCache.current[category] = defaultValue;
                 }
            }

            // Only fetch if valid category and not already cached
            if (category && !variableCache.current[category]) {
                categoriesToFetch.add(category);
            }
        }

        if (categoriesToFetch.size > 0) {
            try {
                const params = new URLSearchParams();
                params.set('categories', Array.from(categoriesToFetch).join(','));
                
                const res = await fetch(`/api/prompt/variables?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    // data format: { [categoryName]: { category: {...}, keywords: [...] } }
                    Object.keys(data).forEach(key => {
                        if (data[key] && data[key].keywords) {
                            variableCache.current[key] = data[key].keywords;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to pre-fetch variables", e);
            }
        }
    };

    preFetchVariables();
  }, [initialContent]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveVariable(null);
      }
    };

    if (activeVariable) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeVariable]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveVariable(null);
      }
    };

    if (activeVariable) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeVariable]);

  // Reset search value when dropdown opens or closes
  useEffect(() => {
    if (!activeVariable) {
      setSearchValue('');
    }
  }, [activeVariable]);

  const handleCopy = async () => {
    try {
      // Logic to strip variables and return clean text
      let textToCopy = content;

      // 1. If JSON, try to format it first (matching render behavior)
      if (isJson) {
        try {
          const jsonObj = JSON.parse(textToCopy);
          textToCopy = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
          // Fallback to raw text if parse fails
        }
      }

      // 2. Replace variables {{ ... }} with their display values
      const variableRegex = /\{\{([^}]+)\}\}/g;
      textToCopy = textToCopy.replace(variableRegex, (match, variableName) => {
          const cleanVariableName = variableName.trim();
          const parts = cleanVariableName.split('|');
          
          if (parts.length === 3) {
              // Format: {{ RelationID|Key|Value }} -> Return Value
              return parts[2].trim();
          }
          
          // Format: {{ Variable }} -> Return Variable
          return cleanVariableName;
      });

      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast.success(t('copied') || 'Copied to clipboard');
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy');
    }
  };

  const handleVariableClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'edit') return;

    const target = e.target as HTMLElement;
    const variableSpan = target.closest('span[data-variable-category]');

    if (variableSpan) {
      e.preventDefault();
      e.stopPropagation();

      const category = variableSpan.getAttribute('data-variable-category');
      const id = variableSpan.getAttribute('data-variable-id') || undefined;
      const index = parseInt(variableSpan.getAttribute('data-variable-index') || '0', 10);
      const originalText = variableSpan.getAttribute('data-variable-original');

      if (category && originalText) {
        const rect = variableSpan.getBoundingClientRect();

        setActiveVariable({
          index,
          category,
          id,
          originalText,
          rect,
        });

        // Helper function to add default value to options
        const addDefaultValueToOptions = (options: VariableOption[]): VariableOption[] => {
          const defaultKey = id || category;
          const defaultValue = defaultValuesCache.current[defaultKey];

          if (defaultValue) {
            const defaultOption: VariableOption = {
              id: '__default__',
              cn: defaultValue,
              en: defaultValue,
            };
            // Prepend default option to the list
            return [defaultOption, ...options];
          }

          return options;
        };

        // Check cache first
        if (variableCache.current[category]) {
            const optionsWithDefault = addDefaultValueToOptions(variableCache.current[category]);
            setVariableOptions(optionsWithDefault);
            setIsLoadingOptions(false);
            return;
        }

        setIsLoadingOptions(true);
        setVariableOptions([]); // Clear previous options
        try {
          const res = await fetch(`/api/prompt/variables?category=${encodeURIComponent(category)}`);
          if (res.ok) {
            const data = await res.json();
            const keywords = data.keywords || [];
            // Update cache (without default value)
            variableCache.current[category] = keywords;
            // Set options with default value
            const optionsWithDefault = addDefaultValueToOptions(keywords);
            setVariableOptions(optionsWithDefault);
          } else {
            // It might be a regular variable not in our DB, just don't show options or show empty
            const optionsWithDefault = addDefaultValueToOptions([]);
            setVariableOptions(optionsWithDefault);
          }
        } catch (error) {
          console.error("Error fetching variables:", error);
          const optionsWithDefault = addDefaultValueToOptions([]);
          setVariableOptions(optionsWithDefault);
        } finally {
          setIsLoadingOptions(false);
        }
      }
    }
  };

  const handleOptionSelect = async (option: VariableOption | string) => {
    if (!activeVariable) return;

    // Handle both VariableOption objects and custom string values
    let newValue: string;
    let isCustomValue = false;

    if (typeof option === 'string') {
      // Custom value entered by user
      newValue = option;
      isCustomValue = true;
    } else {
      // Regular option from the list
      newValue = activeLanguage === 'zh-CN' ? option.cn : option.en;
    }

    // If it's a custom value, add it to the front-end cache only (not database)
    if (isCustomValue) {
      // Generate a temporary ID for the custom keyword
      const customKeyword: VariableOption = {
        id: `custom_${Date.now()}`,
        cn: newValue,
        en: newValue,
      };

      // Update cache with the new keyword at the front
      if (variableCache.current[activeVariable.category]) {
        variableCache.current[activeVariable.category] = [
          customKeyword,
          ...variableCache.current[activeVariable.category],
        ];
      } else {
        variableCache.current[activeVariable.category] = [customKeyword];
      }

      toast.success(
        activeLanguage === 'zh-CN'
          ? '已添加到备选项（临时）'
          : 'Added to suggestions (temporary)'
      );
    }
    
    // Construct new tag strictly preserving the ID if it exists and is different from category
    // Format: {{ ID|Category|Value }}
    let newTag = '';
    const hasExplicitId = activeVariable.id && activeVariable.id !== activeVariable.category;
    
    if (hasExplicitId) {
        // We have a specific ID (e.g. "4" from {{ 4|lighting|... }})
        newTag = `{{ ${activeVariable.id}|${activeVariable.category}|${newValue} }}`;
    } else {
        // No distinct ID, fall back to simple format {{ Category|Value }}
        newTag = `{{ ${activeVariable.category}|${newValue} }}`;
    }

    // Replace occurrences
    let currentIndex = 0;
    // Regex must match exactly what we use in renderContent
    const regex = /\{\{([^}]+)\}\}/g;
    
    const newContent = content.replace(regex, (match) => {
        const currentMatchIndex = currentIndex++;
        
        // If we have an explicit ID, we want to sync ALL tags with that ID
        if (hasExplicitId) {
             const cleanContent = match.slice(2, -2).trim(); // remove {{ }}
             const parts = cleanContent.split('|');
             let currentId = cleanContent;
             
             if (parts.length === 3) {
                 currentId = parts[0].trim();
             } else if (parts.length === 2) {
                 // For {{ Category|Value }}, the ID is the Category
                 currentId = parts[0].trim();
             }
             
             if (currentId === activeVariable.id) {
                 return newTag;
             }
             return match;
        }

        // If no explicit ID, only replace the specific clicked instance
        if (currentMatchIndex === activeVariable.index) {
            return newTag;
        }
        return match;
    });

    setContent(newContent);
    setActiveVariable(null);
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
    // We use a new RegExp with global flag to iterate
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

    let variableMatchIndex = 0;

    const processedText = displayContent.replace(variableRegex, (match, variableName) => {
        const currentMatchIndex = variableMatchIndex++;
        // Check for new format: {{ RelationID|Key|Value }}
        const cleanVariableName = variableName.trim();
        const parts = cleanVariableName.split('|');
        let relationId = cleanVariableName;
        let searchCategory = cleanVariableName;
        let displayName = cleanVariableName;
        let isFormatted = false;

        if (parts.length === 3) {
            relationId = parts[0].trim();
            searchCategory = parts[1].trim();
            displayName = parts[2].trim();
            isFormatted = true;
        } else if (parts.length === 2) {
             relationId = parts[0].trim();
             searchCategory = parts[0].trim();
             displayName = parts[1].trim();
             isFormatted = true;
        }

        // Retrieve the pre-assigned unique color
        const colorClass = idToColorMap.get(relationId) || colors[0];
        
        // Data attributes for interaction - use searchCategory for the API lookup
        // Added data-variable-id to persist the ID part
        const dataAttrs = `data-variable-index="${currentMatchIndex}" data-variable-id="${relationId}" data-variable-category="${searchCategory}" data-variable-original="${match.replace(/"/g, '&quot;')}"`;

        // Render the badge with ID if formatted, otherwise standard pill
        if (isFormatted) {
            return `<span ${dataAttrs} class="cursor-pointer inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105 shadow-sm" style="vertical-align: baseline;">
                <span class="bg-white/20 text-white/90 px-1 rounded-sm text-[10px] mr-1.5 min-w-[1.2em] text-center font-mono leading-tight flex items-center justify-center h-4">${relationId}</span>
                <span class="truncate max-w-[300px]">${displayName}</span>
            </span>`;
        } else {
             // Fallback for non-formatted variables (legacy support)
            return `<span ${dataAttrs} class="cursor-pointer inline-flex items-center rounded-full px-3 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105" style="vertical-align: baseline;">${displayName}</span>`;
        }
    });

    if (isJson) {
        return `<pre class="whitespace-pre-wrap font-mono text-sm bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300">${processedText}</pre>`;
    }

    // For Markdown:
    return md.render(processedText);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
        {/* Dropdown Menu */}
        {activeVariable && (
          <div 
            ref={dropdownRef}
            className="fixed z-50 w-[400px] animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: Math.min(activeVariable.rect.bottom + 8, window.innerHeight - 380),
              left: Math.max(8, Math.min(activeVariable.rect.left, window.innerWidth - 408)),
            }}
          >
             <Command className="rounded-xl border shadow-2xl !bg-white dark:!bg-popover overflow-hidden">
                <CommandInput
                    className="h-12 !bg-white dark:!bg-popover"
                    placeholder={activeLanguage === 'zh-CN' ? '搜索或输入自定义值...' : 'Search or enter custom value...'}
                    value={searchValue}
                    onValueChange={setSearchValue}
                />
                <CommandList className="h-[320px] max-h-[320px]">
                    <CommandEmpty>
                        {isLoadingOptions ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                           "No options found."
                        )}
                    </CommandEmpty>

                    {/* Custom Value Input - Show when user has typed something */}
                    {searchValue.trim() && !isLoadingOptions && (
                        <CommandGroup heading={activeLanguage === 'zh-CN' ? '自定义' : 'Custom'}>
                            <CommandItem
                                onSelect={() => handleOptionSelect(searchValue.trim())}
                                className="cursor-pointer"
                            >
                                <Sparkles className="mr-2 h-5 w-5 text-amber-500" />
                                <span className="font-medium">
                                    {activeLanguage === 'zh-CN' ? '使用自定义值: ' : 'Use custom value: '}
                                </span>
                                <span className="text-muted-foreground ml-1">"{searchValue.trim()}"</span>
                            </CommandItem>
                        </CommandGroup>
                    )}

                    {!isLoadingOptions && variableOptions.length > 0 && (
                        <CommandGroup heading={activeLanguage === 'zh-CN' ? '建议' : 'Suggestions'}>
                            {variableOptions.map((option) => {
                                const isDefault = option.id === '__default__';
                                return (
                                    <CommandItem
                                        key={option.id}
                                        onSelect={() => handleOptionSelect(option)}
                                        className="cursor-pointer"
                                    >
                                        {isDefault ? (
                                            <div className="mr-2 h-5 w-5 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            </div>
                                        ) : (
                                            <Sparkles className="mr-2 h-5 w-5 text-muted-foreground" />
                                        )}
                                        {isDefault && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded mr-2">
                                                {activeLanguage === 'zh-CN' ? '默认' : 'Default'}
                                            </span>
                                        )}
                                        <span>{activeLanguage === 'zh-CN' ? option.cn : option.en}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    )}
                </CommandList>
                
                <div className="flex h-12 items-center justify-end border-t px-3 !bg-white dark:!bg-popover">
                  <button
                    className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
                    onClick={() => setActiveVariable(null)}
                    type="button"
                  >
                    <span>{activeLanguage === 'zh-CN' ? '关闭' : 'Close'}</span>
                    <Kbd className="ml-1">Esc</Kbd>
                  </button>
                </div>
             </Command>
          </div>
        )}

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
                                    onClick={handleVariableClick}
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