# 多语言 JSONB 架构迁移总结

## 📝 迁移概述

本次迁移将 `landing_post` 表从单语言架构升级为多语言 JSONB 架构，以支持中英文双语内容。

## ✅ 已完成的修改

### 1. 数据库 Schema 更新

**文件:** `src/config/db/schema.ts`

主要变更：
- ✅ 移除单独的 `title`, `description`, `prompt`, `promptCn` 字段
- ✅ 添加 `i18nContent` JSONB 字段存储多语言内容
- ✅ 将 `tags` TEXT 字段改为 `tagsArray` TEXT[] 数组
- ✅ 添加 `sourceUrl` 唯一约束
- ✅ 添加 `platform` 索引以提高查询性能

### 2. 配置文件

**新增文件:**
- ✅ `config/predefined_tags.json` - 标签翻译配置文件
  - 包含三大类别：使用场景 (use_cases)、风格 (styles)、主题 (subjects)
  - 每个标签包含键 (key)、中文 (cn) 和英文 (en) 翻译

- ✅ `src/shared/lib/tagTranslator.ts` - 标签翻译工具类
  - 提供单个和批量标签翻译功能
  - O(1) 查询性能

### 3. 类型定义更新

**文件:** `src/app/[locale]/(landing)/_social-highlights/lib/types.ts`

新增类型：
- ✅ `I18nContent` - 多语言内容结构接口
- ✅ `DbPost` - 数据库帖子结构（匹配新 schema）

更新类型：
- ✅ `SocialPost` - 添加 `i18nContent` 字段以支持语言切换

### 4. 数据映射函数

**文件:** `src/app/[locale]/(landing)/_social-highlights/lib/utils.ts`

- ✅ 更新 `mapDbPostToSocialPost` 函数
  - 接受 `language` 参数以提取特定语言内容
  - 自动解析 JSONB 字符串
  - 默认使用中文，英文作为回退
  - 保留完整的 `i18nContent` 以支持前端语言切换

### 5. API 路由更新

**文件:** `src/app/api/posts/route.ts`
- ✅ 更新以支持新的 schema 结构
- ✅ POST 接口正确处理 `i18nContent` 和 `tagsArray`

**文件:** `src/app/api/posts/[id]/route.ts`
- ✅ 实现基于标签数组的智能推荐算法
  - 计算标签交集相似度
  - 按相似度、点赞数、日期综合排序
  - 返回最相关的 3 篇帖子

### 6. 前端组件更新

**文件:** `src/app/[locale]/(landing)/_social-highlights/components/PostCard.tsx`
- ✅ 添加标签显示（最多显示 3 个）
- ✅ 使用 `tagTranslator` 进行实时翻译
- ✅ 根据当前 locale 显示对应语言的标签

**文件:** `src/app/[locale]/(landing)/_social-highlights/components/PostDetail.tsx`
- ✅ 添加标签显示区域
- ✅ 更新翻译按钮逻辑以使用 `i18nContent`
- ✅ 支持中英文内容切换
- ✅ 复制 prompt 时获取当前显示语言的文本

**文件:** `src/app/[locale]/(landing)/_social-highlights/LandingClient.tsx`
- ✅ 传递当前 locale 到 `mapDbPostToSocialPost`
- ✅ 确保列表页显示正确语言的内容

**文件:** `src/app/[locale]/(landing)/posts/[id]/page.tsx`
- ✅ 传递当前 locale 到 `mapDbPostToSocialPost`
- ✅ 确保详情页和推荐帖子显示正确语言的内容

### 7. TypeScript 配置

**文件:** `tsconfig.json`
- ✅ 添加 `@/config/*` 路径映射以支持导入根目录 config 文件

## 🚀 数据库迁移步骤

### 重要提醒
⚠️ **数据库结构发生了重大变化，需要执行以下步骤：**

1. **创建迁移脚本**（根据你的 ORM/迁移工具）:

```sql
-- 1. 添加新字段
ALTER TABLE landing_post
  ADD COLUMN i18n_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN tags_array TEXT[],
  ADD CONSTRAINT landing_post_source_url_unique UNIQUE (source_url);

-- 2. 创建索引
CREATE INDEX idx_landing_post_platform ON landing_post(platform);
CREATE INDEX idx_landing_post_tags_array ON landing_post USING GIN(tags_array);

-- 3. 迁移现有数据（如果有）
-- 将旧的 title, description, prompt 字段迁移到 i18n_content
UPDATE landing_post SET i18n_content = jsonb_build_object(
  'zh-CN', jsonb_build_object(
    'title', COALESCE(title, ''),
    'description', COALESCE(description, ''),
    'prompt', COALESCE(prompt, '')
  ),
  'en', jsonb_build_object(
    'title', COALESCE(title, ''),
    'description', COALESCE(description, ''),
    'prompt', COALESCE(prompt, '')
  )
);

-- 将逗号分隔的 tags 转换为数组
UPDATE landing_post
SET tags_array = string_to_array(tags, ',')
WHERE tags IS NOT NULL AND tags != '';

-- 4. 删除旧字段
ALTER TABLE landing_post
  DROP COLUMN title,
  DROP COLUMN description,
  DROP COLUMN prompt,
  DROP COLUMN prompt_cn,
  DROP COLUMN tags;
```

2. **使用 Drizzle Kit 生成迁移** (如果使用 Drizzle ORM):

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## 📋 测试清单

在部署到生产环境前，请测试以下功能：

- [ ] 列表页正确显示中文/英文内容（根据 locale）
- [ ] 标签正确翻译为当前语言
- [ ] 详情页显示完整的帖子信息
- [ ] 翻译按钮功能正常（中英文切换）
- [ ] 复制 prompt 功能获取正确语言的文本
- [ ] "You Might Also Like" 推荐基于标签相似度正确工作
- [ ] 标签显示限制在 3 个（列表页）
- [ ] 详情页显示所有标签
- [ ] API 路由返回正确的 JSONB 结构
- [ ] 新创建的帖子包含完整的多语言内容

## 📖 使用指南

### 创建新帖子

使用新的 schema 创建帖子时，请确保提供正确的数据结构：

```typescript
const newPost = {
  id: nanoid(),
  i18nContent: {
    'zh-CN': {
      title: '超现实主义女性肖像',
      description: '超写实、电影感的魔幻超现实主义肖像...',
      prompt: '...'
    },
    en: {
      title: 'Surrealist Portrait',
      description: 'A hyper-realistic cinematic portrait...',
      prompt: '...'
    }
  },
  tagsArray: ['portrait_selfie', 'photography', 'cinematic'],
  sourceUrl: 'https://...',
  platform: 'x',
  author: '@username',
  authorAvatar: 'https://...',
  authorDisplayName: 'Display Name',
  imageUrl: 'https://...',
  referenceImageUrl: 'https://...',
  likes: 555,
  comments: 10,
  model: 'Nano Banana Pro',
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### 添加新标签

要添加新标签，编辑 `config/predefined_tags.json`:

```json
{
  "use_cases": {
    "tags": [
      {
        "key": "new_tag_key",
        "cn": "新标签中文名",
        "en": "New Tag English Name"
      }
    ]
  }
}
```

## 🔍 故障排查

### 问题：无法导入 predefined_tags.json

**解决方案：** 确保 `tsconfig.json` 包含 config 路径映射：
```json
"@/config/*": ["./config/*"]
```

### 问题：标签显示为 key 而不是翻译后的名称

**解决方案：** 检查：
1. 标签 key 是否存在于 `predefined_tags.json`
2. `tagTranslator` 是否正确导入
3. 传递给 `tagTranslator.translate()` 的 language 参数是否正确

### 问题：翻译按钮不工作

**解决方案：** 确保：
1. 帖子包含完整的 `i18nContent` 数据
2. `mapDbPostToSocialPost` 保留了 `i18nContent` 字段
3. `isTranslated` 状态正确切换

## 📚 参考文档

- [FRONTEND_API_GUIDE.md](./FRONTEND_API_GUIDE.md) - 完整的前端 API 对接指南
- [config/predefined_tags.json](./config/predefined_tags.json) - 标签配置文件

## 🎯 下一步

1. ✅ 执行数据库迁移
2. ✅ 更新现有帖子数据（如果有）
3. ✅ 运行测试
4. ✅ 部署到测试环境验证
5. ✅ 部署到生产环境

---

**迁移日期:** 2025-12-18
**架构版本:** v2.0 (JSONB Multi-language)
