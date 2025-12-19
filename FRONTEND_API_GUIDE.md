# 前端 API 对接指南 - 多语言 JSONB 架构

## 📋 目录

- [数据库表结构](#数据库表结构)
- [数据查询示例](#数据查询示例)
- [前端数据解析](#前端数据解析)
- [标签翻译](#标签翻译)
- [推荐系统查询](#推荐系统查询)

---

## 📊 数据库表结构

### landing_post 表

| 字段名 | 类型 | 索引 | 说明 |
|--------|------|------|------|
| `id` | TEXT | PK | UUID 主键 |
| `i18n_content` | JSONB | GIN | **多语言内容（核心字段）** |
| `tags_array` | TEXT[] | GIN | **标签键数组** |
| `source_url` | TEXT | UNIQUE | 原始 URL |
| `platform` | TEXT | B-tree | 平台（'x', 'xiaohongshu', 'youtube'） |
| `author` | TEXT | - | 作者用户名 |
| `author_avatar` | TEXT | - | 作者头像 URL |
| `author_display_name` | TEXT | - | 作者显示名称 |
| `image_url` | TEXT | - | 主图片 URL |
| `reference_image_url` | TEXT | - | 参考图 URL |
| `likes` | INTEGER | - | 点赞数 |
| `comments` | INTEGER | - | 评论数 |
| `model` | TEXT | - | AI 模型名称 |
| `created_at` | TIMESTAMP | B-tree | 创建时间 |
| `updated_at` | TIMESTAMP | - | 更新时间 |

---

## 🔑 核心字段详解

### 1. i18n_content (JSONB)

**存储格式：**
```json
{
  "en": {
    "title": "Surrealist Portrait with Floating Objects",
    "description": "A hyper-realistic cinematic portrait...",
    "prompt": "{\n  \"type\": \"image_generation_prompt\",\n  \"style\": \"hyper-realistic\"...\n}"
  },
  "zh-CN": {
    "title": "超现实主义女性肖像-悬浮物体环绕",
    "description": "超写实、电影感的魔幻超现实主义肖像...",
    "prompt": "这是一个结构化的 JSON 提示词..."
  }
}
```

**TypeScript 类型定义：**
```typescript
interface I18nContent {
  en: {
    title: string;
    description: string;
    prompt: string;
  };
  'zh-CN': {
    title: string;
    description: string;
    prompt: string;
  };
  // 未来可扩展: ja, es, fr...
}
```

### 2. tags_array (TEXT[])

**存储格式：**
```json
["portrait_selfie", "photography", "cinematic", "minimalism", "product_marketing"]
```

**说明：**
- 存储的是**标签键**（英文标识符），不是中文/英文标签名
- 前端需要通过标签键查询 `predefined_tags.json` 获取对应语言的显示名称
- 用于推荐系统的相似度匹配

---

## 💻 数据查询示例

### 1. 获取单个帖子（支持多语言）

**SQL (PostgreSQL):**
```sql
-- 方法 1: 在数据库层提取指定语言
SELECT
    id,
    i18n_content->'zh-CN'->>'title' as title,
    i18n_content->'zh-CN'->>'description' as description,
    i18n_content->'zh-CN'->>'prompt' as prompt,
    tags_array as tags,
    image_url,
    author,
    author_avatar,
    author_display_name,
    likes,
    comments,
    platform,
    created_at
FROM landing_post
WHERE id = $1;

-- 方法 2: 返回完整 JSONB（前端自行解析）
SELECT
    id,
    i18n_content,
    tags_array,
    image_url,
    author,
    author_avatar,
    author_display_name,
    likes,
    comments,
    platform,
    created_at
FROM landing_post
WHERE id = $1;
```

**前端 API 响应示例（方法 2）:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "i18n_content": {
    "en": {
      "title": "Surrealist Portrait with Floating Objects",
      "description": "A cinematic portrait...",
      "prompt": "..."
    },
    "zh-CN": {
      "title": "超现实主义女性肖像-悬浮物体环绕",
      "description": "超写实的电影感肖像...",
      "prompt": "..."
    }
  },
  "tags_array": ["portrait_selfie", "photography", "cinematic"],
  "image_url": "https://...",
  "author": "saniaspeaks_",
  "author_avatar": "https://...",
  "author_display_name": "𝗦𝗮𝗻𝗶𝗮",
  "likes": 555,
  "comments": 10,
  "platform": "x",
  "created_at": "2025-12-18T10:30:00Z"
}
```

### 2. 获取帖子列表（分页 + 多语言）

**SQL:**
```sql
SELECT
    id,
    i18n_content->$1->>'title' as title,  -- $1 = 'zh-CN' or 'en'
    i18n_content->$1->>'description' as description,
    tags_array,
    image_url,
    author_avatar,
    likes,
    comments,
    created_at
FROM landing_post
WHERE platform = $2  -- 可选筛选
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

### 3. 按标签筛选

**SQL:**
```sql
-- 筛选包含特定标签的帖子
SELECT
    id,
    i18n_content->'zh-CN'->>'title' as title,
    tags_array,
    image_url,
    likes
FROM landing_post
WHERE 'cyberpunk_scifi' = ANY(tags_array)  -- 数组包含操作符
ORDER BY likes DESC
LIMIT 20;

-- 筛选同时包含多个标签的帖子（AND 逻辑）
SELECT
    id,
    i18n_content->'zh-CN'->>'title' as title,
    tags_array,
    image_url
FROM landing_post
WHERE tags_array @> ARRAY['portrait_selfie', 'photography']::TEXT[]  -- 数组包含子集
ORDER BY created_at DESC;
```

---

## 🎨 前端数据解析

### React/Vue 示例

**1. 根据当前语言显示内容**

```javascript
// React 示例
function PostCard({ post, language = 'zh-CN' }) {
  // 从 i18n_content 中提取当前语言的内容
  const content = post.i18n_content[language] || post.i18n_content['en'];

  return (
    <div className="post-card">
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <img src={post.image_url} alt={content.title} />

      {/* 显示标签（需要翻译） */}
      <div className="tags">
        {post.tags_array.map(tagKey => (
          <Tag key={tagKey} tagKey={tagKey} language={language} />
        ))}
      </div>

      <div className="meta">
        <span>❤️ {post.likes}</span>
        <span>💬 {post.comments}</span>
      </div>
    </div>
  );
}
```

**2. 标签组件（带翻译）**

```javascript
import tagTranslations from '@/config/predefined_tags.json';

function Tag({ tagKey, language }) {
  // 查找标签键对应的翻译
  const tag = findTagTranslation(tagKey, language);

  return (
    <span className="tag">
      {tag ? tag.name : tagKey}
    </span>
  );
}

// 辅助函数：查找标签翻译
function findTagTranslation(tagKey, language) {
  // 遍历 predefined_tags.json 查找
  const categories = ['use_cases', 'styles', 'subjects'];

  for (const categoryKey of categories) {
    const category = tagTranslations[categoryKey];
    const tag = category.tags.find(t => t.key === tagKey);
    if (tag) {
      return {
        name: language === 'zh-CN' ? tag.cn : tag.en,
        category: language === 'zh-CN' ? category.label_cn : category.label_en
      };
    }
  }
  return null;
}
```

**3. 语言切换**

```javascript
// 使用 React Context 或 Redux 管理当前语言
const LanguageContext = React.createContext('zh-CN');

function App() {
  const [language, setLanguage] = useState('zh-CN');

  return (
    <LanguageContext.Provider value={language}>
      <LanguageSwitcher
        current={language}
        onChange={setLanguage}
      />
      <PostList language={language} />
    </LanguageContext.Provider>
  );
}
```

---

## 🏷️ 标签翻译

### 预定义标签配置（predefined_tags.json）

**前端需要加载这个文件用于标签翻译：**

位置：`/config/predefined_tags.json`

**结构：**
```json
{
  "use_cases": {
    "label_cn": "使用场景",
    "label_en": "Use Cases",
    "tags": [
      {
        "key": "profile_avatar",
        "cn": "个人资料 / 头像",
        "en": "Profile / Avatar"
      },
      {
        "key": "social_media_post",
        "cn": "社交媒体帖子",
        "en": "Social Media Post"
      }
      // ...更多标签
    ]
  },
  "styles": {
    "label_cn": "风格",
    "label_en": "Style",
    "tags": [
      {
        "key": "photography",
        "cn": "摄影",
        "en": "Photography"
      }
      // ...更多标签
    ]
  },
  "subjects": {
    // ...
  }
}
```

### 标签翻译工具类

```typescript
// utils/tagTranslator.ts
import predefinedTags from '@/config/predefined_tags.json';

type Language = 'zh-CN' | 'en';

interface Tag {
  key: string;
  cn: string;
  en: string;
}

class TagTranslator {
  private tagMap: Map<string, Tag> = new Map();

  constructor() {
    // 构建标签键到标签对象的映射
    Object.values(predefinedTags).forEach((category: any) => {
      category.tags.forEach((tag: Tag) => {
        this.tagMap.set(tag.key, tag);
      });
    });
  }

  translate(tagKey: string, language: Language): string {
    const tag = this.tagMap.get(tagKey);
    if (!tag) return tagKey; // 回退到显示键

    return language === 'zh-CN' ? tag.cn : tag.en;
  }

  translateBatch(tagKeys: string[], language: Language): string[] {
    return tagKeys.map(key => this.translate(key, language));
  }

  getTag(tagKey: string): Tag | undefined {
    return this.tagMap.get(tagKey);
  }
}

export const tagTranslator = new TagTranslator();
```

**使用示例：**
```javascript
import { tagTranslator } from '@/utils/tagTranslator';

// 翻译单个标签
const tagName = tagTranslator.translate('portrait_selfie', 'zh-CN');
// => "人像 / 自拍"

// 批量翻译
const tagNames = tagTranslator.translateBatch(
  ['portrait_selfie', 'photography', 'cinematic'],
  'en'
);
// => ["Portrait / Selfie", "Photography", "Cinematic / Film Still"]
```

---

## 🔍 推荐系统查询

### "You Might Also Like" 实现

**SQL 查询（基于标签相似度）:**
```sql
WITH target_tags AS (
    SELECT tags_array FROM landing_post WHERE id = $1
),
matching_posts AS (
    SELECT
        p.id,
        p.i18n_content->$2->>'title' as title,  -- $2 = language
        p.image_url,
        p.likes,
        -- 计算匹配的标签数量
        (
            SELECT COUNT(*)
            FROM unnest(p.tags_array) t
            WHERE t = ANY((SELECT tags_array FROM target_tags)::TEXT[])
        ) as matching_tags_count
    FROM landing_post p
    WHERE p.tags_array && (SELECT tags_array FROM target_tags)  -- 数组有交集
      AND p.id != $1  -- 排除自己
)
SELECT *
FROM matching_posts
WHERE matching_tags_count > 0
ORDER BY
    matching_tags_count DESC,  -- 优先相似度高的
    likes DESC,  -- 其次按热度
    created_at DESC
LIMIT 10;
```

**前端 API 调用示例：**
```javascript
async function getRecommendations(postId, language = 'zh-CN', limit = 10) {
  const response = await fetch(`/api/posts/${postId}/recommendations`, {
    params: {
      language,
      limit
    }
  });
  return response.json();
}
```

---

## 📝 API 端点建议

### REST API 设计

```
GET    /api/posts              获取帖子列表（支持筛选、分页、语言）
GET    /api/posts/:id          获取单个帖子详情
GET    /api/posts/:id/recommendations  获取推荐帖子
GET    /api/tags               获取所有可用标签（含翻译）
GET    /api/posts/by-tag/:tagKey  按标签筛选帖子
```

### 查询参数

**列表 API (/api/posts):**
```
?language=zh-CN       - 返回指定语言的内容
?tags=tag1,tag2       - 按标签筛选（多个标签用逗号分隔）
?platform=x           - 按平台筛选
?limit=20             - 每页数量
?offset=0             - 分页偏移
?sort=likes_desc      - 排序方式 (likes_desc, created_at_desc)
```

**推荐 API (/api/posts/:id/recommendations):**
```
?language=zh-CN       - 返回指定语言的内容
?limit=10             - 推荐数量
```

---

## 🎯 前端实现 Checklist

- [ ] 加载 `predefined_tags.json` 配置文件
- [ ] 实现 `TagTranslator` 工具类
- [ ] 创建语言切换上下文（React Context / Vue Provide）
- [ ] 实现 `PostCard` 组件（支持多语言）
- [ ] 实现标签筛选 UI（从预定义标签生成）
- [ ] 实现 "You Might Also Like" 推荐模块
- [ ] 处理 JSONB 数据的类型安全（TypeScript）
- [ ] 添加回退机制（如果某语言缺失，回退到英文）

---

## 🚀 快速开始示例

**完整的帖子展示组件（React + TypeScript）:**

```typescript
import React from 'react';
import { tagTranslator } from '@/utils/tagTranslator';

interface Post {
  id: string;
  i18n_content: {
    en: { title: string; description: string; prompt: string };
    'zh-CN': { title: string; description: string; prompt: string };
  };
  tags_array: string[];
  image_url: string;
  author: string;
  author_avatar: string;
  author_display_name: string;
  likes: number;
  comments: number;
  platform: string;
  created_at: string;
}

interface PostDetailProps {
  post: Post;
  language: 'zh-CN' | 'en';
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, language }) => {
  // 获取当前语言的内容
  const content = post.i18n_content[language];

  return (
    <div className="post-detail">
      {/* 标题 */}
      <h1>{content.title}</h1>

      {/* 主图 */}
      <img src={post.image_url} alt={content.title} />

      {/* 作者信息 */}
      <div className="author">
        <img src={post.author_avatar} alt={post.author_display_name} />
        <span>{post.author_display_name}</span>
      </div>

      {/* 标签 */}
      <div className="tags">
        {post.tags_array.map(tagKey => (
          <span key={tagKey} className="tag">
            {tagTranslator.translate(tagKey, language)}
          </span>
        ))}
      </div>

      {/* 描述 */}
      <p className="description">{content.description}</p>

      {/* 提示词 */}
      <details className="prompt">
        <summary>
          {language === 'zh-CN' ? '查看提示词' : 'View Prompt'}
        </summary>
        <pre>{content.prompt}</pre>
      </details>

      {/* 统计信息 */}
      <div className="stats">
        <span>❤️ {post.likes}</span>
        <span>💬 {post.comments}</span>
        <span>📅 {new Date(post.created_at).toLocaleDateString(language)}</span>
      </div>
    </div>
  );
};
```

---

## 📞 联系与支持

如果有任何疑问，请参考：
- `config/predefined_tags.json` - 完整标签列表
- `scripts/migrate_to_jsonb_schema.py` - 数据迁移脚本
- PostgreSQL JSONB 文档: https://www.postgresql.org/docs/current/datatype-json.html

---

**最后更新**: 2025-12-18
**架构版本**: v2.0 (JSONB 多语言方案)
