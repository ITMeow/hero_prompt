import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import {
  getLocalPostsAndCategories,
  PostType as PostDataType,
} from '@/shared/models/post';
import { Blog as BlogType, Post as PostType } from '@/shared/types/blocks/blog';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'updates.metadata',
  canonicalUrl: '/updates',
});

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load updates data
  const t = await getTranslations('updates');

  let posts: PostType[] = [];

  try {
    const { posts: allPosts } = await getLocalPostsAndCategories({
      locale,
      type: PostDataType.LOG,
      postPrefix: '/updates/',
    });

    posts = allPosts.sort((a, b) => {
      const dateA = new Date(a.date || '').getTime();
      const dateB = new Date(b.date || '').getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.log('getting posts failed:', error);
  }

  // build updates data
  const blog: BlogType = {
    ...t.raw('updates'),
    posts,
  };

  // build page sections
  const page: DynamicPage = {
    sections: {
      updates: {
        block: 'updates',
        data: {
          blog,
        },
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
