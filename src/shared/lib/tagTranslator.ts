import predefinedTags from '@/config/predefined_tags.json';

export type Language = 'zh-CN' | 'en';

interface Tag {
  key: string;
  cn: string;
  en: string;
}

interface TagCategory {
  label_cn: string;
  label_en: string;
  tags: Tag[];
}

type PredefinedTags = Record<string, TagCategory>;

class TagTranslator {
  private tagMap: Map<string, Tag> = new Map();

  constructor() {
    // Build a map from tag key to tag object for O(1) lookup
    const tags = predefinedTags as PredefinedTags;
    Object.values(tags).forEach((category) => {
      category.tags.forEach((tag) => {
        this.tagMap.set(tag.key, tag);
      });
    });
  }

  /**
   * Translate a single tag key to the specified language
   * @param tagKey The tag key (e.g., 'portrait_selfie')
   * @param language The target language ('zh-CN' or 'en')
   * @returns The translated tag name, or the key itself if not found
   */
  translate(tagKey: string, language: Language): string {
    const tag = this.tagMap.get(tagKey);
    if (!tag) return tagKey; // Fallback to displaying the key

    return language === 'zh-CN' ? tag.cn : tag.en;
  }

  /**
   * Translate multiple tag keys at once
   * @param tagKeys Array of tag keys
   * @param language The target language
   * @returns Array of translated tag names
   */
  translateBatch(tagKeys: string[], language: Language): string[] {
    return tagKeys.map((key) => this.translate(key, language));
  }

  /**
   * Get the full tag object for a given key
   * @param tagKey The tag key
   * @returns The tag object or undefined if not found
   */
  getTag(tagKey: string): Tag | undefined {
    return this.tagMap.get(tagKey);
  }

  /**
   * Get all available tags grouped by category
   * @returns The predefined tags structure
   */
  getAllTags(): PredefinedTags {
    return predefinedTags as PredefinedTags;
  }

  /**
   * Get category label in the specified language
   * @param categoryKey The category key (e.g., 'use_cases')
   * @param language The target language
   * @returns The category label
   */
  getCategoryLabel(categoryKey: string, language: Language): string {
    const tags = predefinedTags as PredefinedTags;
    const category = tags[categoryKey];
    if (!category) return categoryKey;

    return language === 'zh-CN' ? category.label_cn : category.label_en;
  }
}

// Export a singleton instance
export const tagTranslator = new TagTranslator();
