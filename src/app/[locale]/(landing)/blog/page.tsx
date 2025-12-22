import NotFoundPage from '@/app/not-found';

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  return <NotFoundPage />;

  /*
  const { locale } = await params;

  // load blog data
  const t = await getTranslations('blog');

  let posts: PostType[] = [];
  let categories: CategoryType[] = [];

  // current category data
  const currentCategory: CategoryType = {
    id: 'all',
    slug: 'all',
    title: t('page.all'),
    url: `/blog`,
  };

  try {
    const { page: pageNum, pageSize } = await searchParams;
    const page = pageNum || 1;
    const limit = pageSize || 30;

    const { posts: allPosts, categories: allCategories } =
      await getPostsAndCategories({
        locale,
        page,
        limit,
      });

    posts = allPosts;
    categories = allCategories;

    categories.unshift(currentCategory);
  } catch (error) {
    console.log('getting posts failed:', error);
  }

  // build blog data
  const blog: BlogType = {
    ...t.raw('blog'),
    categories,
    currentCategory,
    posts,
  };

  // build page sections
  const page: DynamicPage = {
    sections: {
      blog: {
        block: 'blog',
        data: {
          blog,
        },
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
  */
}
