import NotFoundPage from '@/app/not-found';

export default async function ShowcasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <NotFoundPage />;

  /*
  const { locale } = await params;
  setRequestLocale(locale);

  // load landing data
  const tl = await getTranslations('landing');

  // load showcases data
  const t = await getTranslations('showcases');

  const page: DynamicPage = {
    sections: {
      showcases: t.raw('showcases'),
      cta: tl.raw('cta'),
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
  */
}
