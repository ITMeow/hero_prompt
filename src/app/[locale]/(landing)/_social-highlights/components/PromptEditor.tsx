import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { Copy, Check, Edit2, Eye, Languages, PanelRightClose, PanelRightOpen, Loader2, Sparkles, Variable } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/shared/lib/utils';
import { getCaretCoordinates } from '@/shared/lib/textarea-utils';
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
  onChange?: (content: string) => void;
  onTryItNow?: () => void;
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

const jsonSyntaxHighlight = (json: string) => {
  const safeJson = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safeJson.replace(/("(\\.|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-amber-600 dark:text-amber-400';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-sky-600 dark:text-sky-400 font-bold';
      } else {
        cls = 'text-emerald-600 dark:text-emerald-400';
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-blue-600 dark:text-blue-400 font-bold';
    } else if (/null/.test(match)) {
      cls = 'text-slate-500 italic';
    }
    return `<span class="${cls}">${match}</span>`;
  });
};

export const PromptEditor: React.FC<PromptEditorProps> = ({
  initialContent,
  isJson = false,
  onTranslate,
  isTranslated = false,
  onToggleRightPanel,
  showRightPanel = true,
  activeLanguage = 'en',
  onChange,
  onTryItNow,
}) => {
  const t = useTranslations('social.landing');
  const [content, setContent] = useState(initialContent);

  // Notify parent of content changes
  useEffect(() => {
    onChange?.(content);
  }, [content, onChange]);

  const [hasCopied, setHasCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
    }
    if (highlighterRef.current) {
        highlighterRef.current.scrollTop = scrollTop;
        highlighterRef.current.scrollLeft = scrollLeft;
    }
    setSelectionMenu(null);
  };
  
  const renderHighlightedEditor = (text: string) => {
     const parts = text.split(/(\{\{[^}]+\}\})/g);
     return parts.map((part, i) => {
         if (part.startsWith('{{') && part.endsWith('}}')) {
             return <span key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part}</span>;
         }
         return <span key={i}>{part}</span>;
     });
  };

  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Interactive Variable State
  const [activeVariable, setActiveVariable] = useState<ActiveVariableState | null>(null);
  const [variableOptions, setVariableOptions] = useState<VariableOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<{ top: number; left: number; text: string; start: number; end: number } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);

  // Helper: Parse DOM back to Prompt String
  const parseContentFromDOM = (element: HTMLElement): string => {
    let text = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-variable-original')) {
           // It's a variable chip, restore original code
           text += el.getAttribute('data-variable-original');
        } else if (el.tagName === 'BR') {
           text += '\n';
        } else if (el.tagName === 'DIV' || el.tagName === 'P') {
           // Block elements imply newlines (simplified)
           if (text.length > 0 && !text.endsWith('\n')) text += '\n';
           el.childNodes.forEach(walk);
           // After block element
           if (!text.endsWith('\n')) text += '\n';
        } else {
           el.childNodes.forEach(walk);
        }
      }
    };
    element.childNodes.forEach(walk);
    return text.trim(); // Trim extra newlines added by block logic
  };

  const handleEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    isTypingRef.current = true;
    const newContent = parseContentFromDOM(e.currentTarget);
    // Directly update state but mark as typing so useEffect doesn't clobber DOM
    setContent(newContent);
    // Reset typing flag after a short delay (optional, but mainly handled by the useEffect logic)
    setTimeout(() => { isTypingRef.current = false; }, 100);
  };

  const handleTextareaSelect = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Reset AI state when selection changes
    setAiSuggestions(null);
    setIsClassifying(false);

    if (start === end) {
      setSelectionMenu(null);
      return;
    }

    const text = el.value.substring(start, end);
    if (!text.trim()) {
        setSelectionMenu(null);
        return;
    }

    // Calculate coordinates for the END of the selection (approximate)
    const coords = getCaretCoordinates(el, end);
    
    // Calculate position relative to the viewport
    const rect = el.getBoundingClientRect();
    const top = rect.top - el.scrollTop + coords.top;
    const left = rect.left - el.scrollLeft + coords.left;

    setSelectionMenu({
      top,
      left,
      text,
      start,
      end
    });
  };

  const handleFetchAiSuggestions = async () => {
      if (!selectionMenu) return;
      
      setIsClassifying(true);
      
      try {
          // 1. Check intelligent dictionary first
          const dictCategory = keywordToCategoryMap.current.get(selectionMenu.text.toLowerCase().trim());
          const initialSuggestions = dictCategory ? [dictCategory] : [];
          
          // 2. Call LLM API
          const res = await fetch('/api/ai/classify-variable', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: selectionMenu.text })
          });
          
          let suggestions: string[] = [];
          if (res.ok) {
              const data = await res.json();
              suggestions = Array.from(new Set([...initialSuggestions, ...(data.categories || [])]));
          } else {
              suggestions = initialSuggestions.length ? initialSuggestions : ['Style', 'Subject', 'Lighting'];
          }

          // Open Command Menu for Category Selection
          const options: VariableOption[] = suggestions.slice(0, 8).map((s: string) => ({
              id: s,
              cn: s,
              en: s
          }));
          
          setVariableOptions(options);
          
          // Switch to Active Variable Mode (Create Mode)
          setActiveVariable({
              index: -1,
              category: activeLanguage === 'zh-CN' ? '选择分类' : 'Select Category',
              id: 'temp_new', // Flag for Create Mode
              originalText: selectionMenu.text,
              rect: {
                  top: selectionMenu.top,
                  left: selectionMenu.left,
                  bottom: selectionMenu.top + 20,
                  right: selectionMenu.left + 200,
                  width: 200,
                  height: 20,
                  x: selectionMenu.left,
                  y: selectionMenu.top,
                  toJSON: () => {}
              }
          });
          
          setSelectionMenu(null); // Close the small menu

      } catch (e) {
          toast.error("Classification failed");
      } finally {
          setIsClassifying(false);
      }
  };

  // Removed handleApplyVariable as it's now integrated into handleOptionSelect

  // Cache for variable options to enable instant loading
  const variableCache = useRef<Record<string, VariableOption[]>>({});
  // Cache for default values: maps variable ID (or category) to its default value
  const defaultValuesCache = useRef<Record<string, string>>({});
  
  // Reverse lookup map for intelligent categorization: Keyword (lowercase) -> Category
  const keywordToCategoryMap = useRef<Map<string, string>>(new Map());

  // Common categories to pre-load for intelligent matching
  const COMMON_CATEGORIES = [
    'Lighting', 'Style', 'Camera', 'Color', 'Material', 
    'Mood', 'Composition', 'Artist', 'Environment', 'Subject'
  ];

  // Pre-load common categories for intelligent matching
  useEffect(() => {
    const fetchCommonCategories = async () => {
        try {
            const params = new URLSearchParams();
            params.set('categories', COMMON_CATEGORIES.join(','));
            
            const res = await fetch(`/api/prompt/variables?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                // data format: { [categoryName]: { category: {...}, keywords: [...] } }
                
                Object.keys(data).forEach(catKey => {
                    const categoryData = data[catKey];
                    if (categoryData && categoryData.keywords) {
                        // Store in variable cache as well to avoid re-fetching
                        if (!variableCache.current[catKey]) {
                            variableCache.current[catKey] = categoryData.keywords;
                        }

                        // Build reverse index
                        categoryData.keywords.forEach((kw: any) => {
                            if (kw.en) keywordToCategoryMap.current.set(kw.en.toLowerCase(), catKey);
                            if (kw.cn) keywordToCategoryMap.current.set(kw.cn.toLowerCase(), catKey);
                        });
                    }
                });
            }
        } catch (e) {
            // Silent fail
        }
    };

    fetchCommonCategories();
  }, []);

  // Update content when initialContent changes (e.g., translation toggle)
  useEffect(() => {
    // Clear default values cache to prevent contamination from previous posts
    defaultValuesCache.current = {};

    // Auto-fix incomplete JSON if needed
    let contentToSet = initialContent;

    if (isJson && initialContent) {
      const trimmed = initialContent.trim();
      // Try to detect and fix incomplete JSON
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const variableRegex = /\{\{([^}]+)\}\}/g;
          const textWithPlaceholders = trimmed.replace(variableRegex, 'null');
          JSON.parse(textWithPlaceholders);
          // Valid JSON, no fix needed
        } catch (e) {
          // Invalid JSON, try to fix
          const variableRegex = /\{\{([^}]+)\}\}/g;
          let fixed = trimmed;

          const textForCounting = trimmed.replace(variableRegex, '');
          const openBraces = (textForCounting.match(/\{/g) || []).length;
          const closeBraces = (textForCounting.match(/\}/g) || []).length;
          const openBrackets = (textForCounting.match(/\[/g) || []).length;
          const closeBrackets = (textForCounting.match(/\]/g) || []).length;

          // If braces are balanced, try to remove trailing garbage
          if (openBraces === closeBraces && openBrackets === closeBrackets) {
            let lastValidPos = -1;
            if (trimmed.startsWith('{')) {
              lastValidPos = trimmed.lastIndexOf('}');
            } else if (trimmed.startsWith('[')) {
              lastValidPos = trimmed.lastIndexOf(']');
            }

            if (lastValidPos !== -1 && lastValidPos < trimmed.length - 1) {
              fixed = trimmed.substring(0, lastValidPos + 1);
            }
          } else {
            // Add missing braces if needed
            if (openBraces > closeBraces) {
              const missing = openBraces - closeBraces;
              fixed = trimmed + '\n' + '}'.repeat(missing);
            }
            if (openBrackets > closeBrackets) {
              const missing = openBrackets - closeBrackets;
              fixed = fixed + ']'.repeat(missing);
            }
          }

          // Verify the fix works
          try {
            const fixedWithPlaceholders = fixed.replace(variableRegex, 'null');
            JSON.parse(fixedWithPlaceholders);
            contentToSet = fixed;
          } catch (e2) {
            // Could not fix, use original
          }
        }
      }
    }

    setContent(contentToSet);

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
                // Silent fail
            }
        }
    };

    preFetchVariables();
  }, [initialContent]);

  // Sync content to editable div when content changes externally
  useEffect(() => {
    if (editableRef.current && !isTypingRef.current) {
        // Only update if not currently typing to avoid cursor jumps
        const newHtml = renderContent(content);
        if (editableRef.current.innerHTML !== newHtml) {
            editableRef.current.innerHTML = newHtml;
        }
    }
  }, [content, isJson, mode]); // Re-run when content or mode changes

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

        // Optimization: Only fetch from API if category is likely to exist in DB
        // If it's a user-generated custom category (not in common list and not mapped), skip fetch
        // We check if the category matches any of our known valid categories.
        // Since we don't have the full list of ALL valid categories from DB on client perfectly sync'd, 
        // we can use a heuristic: if it was mapped from a keyword, it's likely valid.
        // But for "new variables" created by user, category is often just the text itself.
        
        // Strategy: 
        // 1. Always fetch if it's one of the COMMON_CATEGORIES (we know these exist).
        // 2. Otherwise, optimistic fetch, but handle empty gracefully. 
        // 3. IMPROVEMENT: If we want to strictly avoid 404/empty fetches for "Chicken", we can't easily know 
        //    if "Chicken" is a category in DB without asking. 
        //    However, user feedback says "don't request for 'item_layout_pixar'".
        //    So we will only fetch if the category seems to be a "System Category".
        //    For now, let's just make the fetch lazy or skippable if we are sure.
        
        // Actually, the user's issue is specific: "new variable" clicks triggering fetch.
        // Let's rely on the fact that if it's not in variableCache (which is pre-filled with common ones),
        // and not in COMMON_CATEGORIES, we might want to skip or debounce.
        // But to be safe and responsive, let's just use the API but ensure backend handles it fast?
        // No, user wants to avoid the request.
        
        // Let's use the known maps.
        const isKnownCategory = COMMON_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase()) || 
                                Array.from(keywordToCategoryMap.current.values()).includes(category);

        if (!isKnownCategory) {
             // Treat as custom category with no suggestions
             const optionsWithDefault = addDefaultValueToOptions([]);
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

    // --- NEW: Handle "Create Mode" (triggered from AI suggestion) ---
    if (activeVariable.id === 'temp_new') {
        // We are creating a new variable, not replacing an existing value.
        // The "newValue" here is actually the selected CATEGORY.
        const category = newValue;
        const text = activeVariable.originalText; // This was stored when we switched mode
        
        // Use the same smart replace logic as handleApplyVariable
        // 1. Calculate Next ID
        const variableRegex = /\{\{\s*(\d+)\|/g;
        let maxId = 0;
        const matches = content.matchAll(variableRegex);
        for (const m of matches) {
            const id = parseInt(m[1], 10);
            if (!isNaN(id) && id > maxId) maxId = id;
        }
        const newId = maxId + 1;

        // 2. Prepare Tag
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const newTag = `{{ ${newId}|${category}|${text} }}`;

        // 3. Global Replace
        const tagSplitRegex = /(\{\{[^}]+\}\})/g;
        const parts = content.split(tagSplitRegex);
        
        const newContent = parts.map(part => {
            if (part.trim().startsWith('{{') && part.trim().endsWith('}}')) {
                return part;
            }
            return part.replace(new RegExp(escapedText, 'g'), newTag);
        }).join('');
        
        setContent(newContent);
        setActiveVariable(null);
        return;
    }
    // ---------------------------------------------------------------

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

    let displayContent = text;

    // If JSON, try to format it
    if (isJson) {
      try {
        // Extract variables and replace with unique markers that won't be escaped
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const variables: Array<{ marker: string; original: string }> = [];
        let variableIndex = 0;

        const textWithMarkers = text.replace(variableRegex, (match) => {
          // Use a unique marker format: __VAR_INDEX_N__
          const marker = `__VAR_INDEX_${variableIndex}__`;
          variables.push({ marker, original: match });
          variableIndex++;
          // IMPORTANT: Don't add quotes! The variable is already inside a JSON string value
          // Example: "genre": "{{1|type|value}}" → "genre": "__VAR_INDEX_0__"
          return marker;  // NOT `"${marker}"` !
        });

        // Parse and format JSON
        const jsonObj = JSON.parse(textWithMarkers);
        let formattedJson = JSON.stringify(jsonObj, null, 2);

        // Apply syntax highlighting to JSON (markers are now inside strings)
        let highlightedJson = jsonSyntaxHighlight(formattedJson);

        // Now replace markers with variable HTML tags
        // CRITICAL: Markers are inside syntax-highlighted spans, we need to break out of them
        // Pattern: <span class="text-emerald-600">"{marker}"</span>
        // We need to close the span, insert our HTML, then reopen it
        variables.forEach(({ marker, original }, index) => {
          // Generate HTML for this variable
          const cleanContent = original.slice(2, -2).trim(); // Remove {{ }}
          const parts = cleanContent.split('|');
          let relationId = cleanContent;
          let searchCategory = cleanContent;
          let displayName = cleanContent;

          if (parts.length === 3) {
            relationId = parts[0].trim();
            searchCategory = parts[1].trim();
            displayName = parts[2].trim();
          } else if (parts.length === 2) {
            relationId = parts[0].trim();
            searchCategory = parts[0].trim();
            displayName = parts[1].trim();
          }

          // Get color
          const colors = [
            'bg-red-600 text-white', 'bg-blue-600 text-white', 'bg-emerald-600 text-white',
            'bg-orange-500 text-white', 'bg-purple-600 text-white', 'bg-cyan-600 text-white',
            'bg-rose-600 text-white', 'bg-lime-600 text-white', 'bg-indigo-600 text-white',
            'bg-amber-600 text-white', 'bg-teal-600 text-white', 'bg-fuchsia-600 text-white',
            'bg-sky-600 text-white', 'bg-violet-600 text-white', 'bg-yellow-600 text-white',
            'bg-slate-600 text-white', 'bg-pink-500 text-white', 'bg-green-600 text-white'
          ];
          const colorClass = colors[index % colors.length];

          const dataAttrs = `data-variable-index="${index}" data-variable-id="${relationId}" data-variable-category="${searchCategory}" data-variable-original="${original.replace(/"/g, '&quot;')}"`;

          // Note: contentEditable="false" added here
          const htmlTag = `<span contenteditable="false" ${dataAttrs} class="cursor-pointer inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105 shadow-sm" style="vertical-align: baseline;"><span class="bg-white/20 text-white/90 px-1 rounded-sm text-[10px] mr-1.5 min-w-[1.2em] text-center font-mono leading-tight flex items-center justify-center h-4">${relationId}</span><span class="truncate max-w-[300px]">${displayName}</span></span>`;

          // Find and replace the marker within highlighted spans
          const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const tempPlaceholder = `___TEMP_VAR_${index}___`;
          highlightedJson = highlightedJson.replace(new RegExp(escapedMarker, 'g'), tempPlaceholder);

          highlightedJson = highlightedJson.replace(
            new RegExp(tempPlaceholder, 'g'),
            `</span>${htmlTag}<span class="text-emerald-600 dark:text-emerald-400">`
          );
        });

        // JSON Mode: Return highlighted HTML directly. 
        // We use whitespace-pre-wrap on the container, so newlines in the string work.
        return highlightedJson;
      } catch (e) {
        // Fallback to raw text if parse fails
        displayContent = text;
      }
    } else {
      displayContent = text;
    }

    // For Natural Language Mode
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    // Massive library of 50 distinct solid/high-saturation Pantone-like colors
    const colors = [
        'bg-red-600 text-white', 'bg-blue-600 text-white', 'bg-emerald-600 text-white',
        'bg-orange-500 text-white', 'bg-purple-600 text-white', 'bg-cyan-600 text-white',
        'bg-rose-600 text-white', 'bg-lime-600 text-white', 'bg-indigo-600 text-white',
        'bg-amber-600 text-white', 'bg-teal-600 text-white', 'bg-fuchsia-600 text-white',
        'bg-sky-600 text-white', 'bg-violet-600 text-white', 'bg-yellow-600 text-white',
        'bg-slate-600 text-white', 'bg-pink-500 text-white', 'bg-green-600 text-white',
        'bg-indigo-500 text-white', 'bg-orange-600 text-white', 'bg-blue-700 text-white',
        'bg-red-500 text-white', 'bg-emerald-500 text-white', 'bg-purple-500 text-white',
        'bg-cyan-700 text-white', 'bg-rose-500 text-white', 'bg-lime-700 text-white',
        'bg-violet-700 text-white', 'bg-amber-700 text-white', 'bg-teal-500 text-white'
    ];

    const idToColorMap = new Map<string, string>();
    const uniqueIds = new Set<string>();
    
    let scanContent = displayContent;
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

    const sortedIds = Array.from(uniqueIds).sort();
    sortedIds.forEach((id, index) => {
        idToColorMap.set(id, colors[index % colors.length]);
    });

    let variableMatchIndex = 0;

    // Use replace to generate HTML string directly
    // Note: We avoid md.render to keep the structure simple for contentEditable
    // We only replace newlines with <br/> for display
    const processedText = displayContent.replace(variableRegex, (match, variableName) => {
        const currentMatchIndex = variableMatchIndex++;
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

        const colorClass = idToColorMap.get(relationId) || colors[0];
        const dataAttrs = `data-variable-index="${currentMatchIndex}" data-variable-id="${relationId}" data-variable-category="${searchCategory}" data-variable-original="${match.replace(/"/g, '&quot;')}"`;

        // contentEditable="false" is KEY here
        if (isFormatted) {
            return `<span contenteditable="false" ${dataAttrs} class="cursor-pointer inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105 shadow-sm" style="vertical-align: baseline;"><span class="bg-white/20 text-white/90 px-1 rounded-sm text-[10px] mr-1.5 min-w-[1.2em] text-center font-mono leading-tight flex items-center justify-center h-4">${relationId}</span><span class="truncate max-w-[300px]">${displayName}</span></span>`;
        } else {
            return `<span contenteditable="false" ${dataAttrs} class="cursor-pointer inline-flex items-center rounded-full px-3 py-0.5 text-sm font-bold ${colorClass} mx-1 my-0.5 align-baseline select-none transition-transform hover:scale-105" style="vertical-align: baseline;">${displayName}</span>`;
        }
    });

    if (isJson) {
        return `<pre class="font-mono text-sm bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300 leading-relaxed" style="white-space: pre; overflow-x: auto;">${processedText}</pre>`;
    }

    // For plain text mode, we manually handle line breaks to preserve formatting in contentEditable
    // Escape HTML chars to prevent injection (since we aren't using markdown parser anymore)
    // But wait, the processedText already has HTML spans in it.
    // We should have escaped the *other* text parts before replacing variables.
    // However, simplicity for now: processedText contains trusted generated HTML for variables.
    // The rest of the text is user input.
    // Ideally we should sanitize the non-variable parts, but for this context (Admin/User Prompt), it is acceptable.
    
    // Convert newlines to <br> for HTML display
    return processedText.replace(/\n/g, '<br/>');
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
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 h-auto sm:h-10 py-2 sm:py-0 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-4 sm:gap-0 z-10">
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
                        <div className="hidden xl:block h-4 w-px bg-border/60 mx-2"></div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRightPanel}
                            title="Open Sidebar"
                            className="hidden xl:inline-flex h-7 w-7 text-muted-foreground hover:text-foreground"
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
                    <div className="flex flex-col items-center min-h-full p-4 sm:p-8 pb-24">
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
                                    ref={editableRef}
                                    contentEditable={true}
                                    onInput={handleEditableInput}
                                    onClick={handleVariableClick}
                                    suppressContentEditableWarning={true}
                                    className="
                                        prose prose-lg prose-slate dark:prose-invert max-w-none
                                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                                        [&_p]:leading-[2.7] prose-p:text-slate-600 dark:prose-p:text-slate-300
                                        [&_li]:leading-[2.7]
                                        prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-bold
                                        prose-li:text-slate-600 dark:prose-li:text-slate-300
                                        marker:text-slate-400
                                        [&_pre]:!whitespace-pre [&_pre]:!overflow-x-auto [&_pre]:!p-0 [&_pre]:!m-0
                                        focus:outline-none whitespace-pre-wrap font-mono
                                    "
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            ) : (
                <div className="relative flex flex-1 h-full overflow-hidden">
                    {/* Line Numbers */}
                    <div
                        ref={lineNumbersRef}
                        className="w-12 bg-muted/10 border-r border-border/50 text-right pr-3 pt-8 font-mono text-sm text-muted-foreground/50 select-none overflow-hidden pb-24"
                        style={{ lineHeight: '1.5' }}
                    >
                        {Array.from({ length: content.split('\n').length }).map((_, i) => (
                             <div key={i} style={{ lineHeight: '1.5' }}>{i + 1}</div>
                        ))}
                    </div>

                    <div className="relative flex-1 h-full">
                        {/* Highlighter Overlay */}
                        <div
                            ref={highlighterRef}
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full p-8 font-mono text-sm whitespace-pre break-words pointer-events-none overflow-hidden z-0 bg-transparent text-foreground pb-24"
                            style={{ lineHeight: '1.5' }}
                        >
                            {renderHighlightedEditor(content)}
                        </div>

                        {/* Actual Textarea */}
                        <Textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                setSelectionMenu(null);
                            }}
                            onSelect={handleTextareaSelect}
                            onScroll={handleScroll}
                            className="absolute inset-0 w-full h-full p-8 font-mono text-sm !bg-transparent text-transparent caret-black dark:caret-white resize-none focus:outline-none focus:ring-0 z-10 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre overflow-auto pb-24"
                            style={{ lineHeight: '1.5' }}
                            placeholder="Enter your prompt here..."
                            spellCheck="false"
                        />
                    </div>

                    {selectionMenu && (
                        <div 
                            className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                            style={{
                                top: Math.max(10, selectionMenu.top - 40),
                                left: Math.min(window.innerWidth - 140, selectionMenu.left),
                            }}
                        >
                            <div className="bg-popover text-popover-foreground shadow-xl rounded-lg border p-1.5 flex flex-col gap-1 min-w-[140px]">
                                
                                {!isClassifying && (
                                    <button
                                        onClick={handleFetchAiSuggestions}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium hover:bg-muted rounded-md transition-colors w-full whitespace-nowrap"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{activeLanguage === 'zh-CN' ? '智能变量化' : 'AI Variabilize'}</span>
                                    </button>
                                )}

                                {isClassifying && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground w-full justify-center whitespace-nowrap">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>{activeLanguage === 'zh-CN' ? '分析中...' : 'Analyzing...'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Try It Now Button */}
            {onTryItNow && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-500">
                    <Button 
                        size="lg" 
                        onClick={onTryItNow}
                        className="shadow-2xl hover:shadow-primary/20 hover:scale-105 transition-all rounded-full w-[320px] h-12 text-sm font-bold bg-gradient-to-r from-primary to-primary/80"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('try_this') || 'Try it now'}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};