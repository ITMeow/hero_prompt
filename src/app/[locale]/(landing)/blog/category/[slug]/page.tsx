import NotFoundPage from '@/app/not-found';

export default async function CategoryBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  return <NotFoundPage />;

  /*
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // load blog data
  const t = await getTranslations('blog');

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  // get current category
  const categoryData = await findTaxonomy({
    slug,
    status: TaxonomyStatus.PUBLISHED,
  });
  if (!categoryData) {
    return <Empty message={`category not found`} />;
  }

  // get posts data
  const postsData = await getPosts({
    category: categoryData.id,
    type: DBPostType.ARTICLE,
    status: PostStatus.PUBLISHED,
    page,
    limit,
  });

  // get categories data
  const categoriesData = await getTaxonomies({
    type: TaxonomyType.CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
  });

  // current category data
  const currentCategory: CategoryType = {
    id: categoryData.id,
    slug: categoryData.slug,
    title: categoryData.title,
    url: `/blog/category/${categoryData.slug}`,
  };

  // build category
  const categories: CategoryType[] = categoriesData.map((category) => ({
    id: category.id,
    slug: category.slug,
    title: category.title,
    url: `/blog/category/${category.slug}`,
  }));
  categories.unshift({
    id: 'all',
    slug: 'all',
    title: t('page.all'),
    url: `/blog`,
  });

  // build posts
  const posts: PostType[] = postsData.map((post) => ({
    id: post.id,
    title: post.title || '',
    description: post.description || '',
    author_name: post.authorName || '',
    author_image: post.authorImage || '',
    created_at: moment(post.createdAt).format('MMM D, YYYY') || '',
    image: post.image || '',
    url: `/blog/${post.slug}`,
  }));

  // build blog
  const blog: BlogType = {
    ...t.raw('blog'),
    categories,
    currentCategory,
    posts,
  };

  // build page sections
  const _page: DynamicPage = {
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

  return <Page locale={locale} page={_page} />;
  */
}
