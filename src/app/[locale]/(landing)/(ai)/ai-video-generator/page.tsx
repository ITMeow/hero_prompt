import NotFoundPage from '@/app/not-found';

export default async function AiVideoGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <NotFoundPage />;

  const { locale } = await params;
  setRequestLocale(locale);

  // get ai video data
  const t = await getTranslations('ai.video');

  // get landing page data
  const tl = await getTranslations('landing');

  // build page sections
  const page: DynamicPage = {
    sections: {
      hero: {
        title: t.raw('page.title'),
        description: t.raw('page.description'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'hero background',
        },
      },
      generator: {
        component: <VideoGenerator srOnlyTitle={t.raw('generator.title')} />,
      },
      faq: tl.raw('faq'),
      cta: tl.raw('cta'),
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
