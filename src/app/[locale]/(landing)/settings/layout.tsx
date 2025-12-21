import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ConsoleLayout } from '@/shared/blocks/console/layout';

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('settings.sidebar');

  // settings title
  const title = t('title');

  // settings nav
  let nav = t.raw('nav');

  // Filter out hidden items from nav (sidebar)
  if (nav && nav.items && Array.isArray(nav.items)) {
    nav.items = nav.items.filter(
      (item: any) =>
        !item.url?.includes('/settings/apikeys') &&
        !item.url?.includes('/activity')
    );
  }

  let topNav = t.raw('top_nav');

  // Filter out hidden items from top_nav (e.g. Activity)
  if (topNav && topNav.items && Array.isArray(topNav.items)) {
    topNav.items = topNav.items.filter(
      (item: any) => !item.url?.includes('/activity')
    );
  }

  return (
    <ConsoleLayout
      title={title}
      nav={nav}
      topNav={topNav}
      className="py-16 md:py-20"
    >
      {children}
    </ConsoleLayout>
  );
}
