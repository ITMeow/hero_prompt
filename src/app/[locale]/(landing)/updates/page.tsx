import NotFoundPage from '@/app/not-found';

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <NotFoundPage />;

  /*
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
  */
}
