import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ConsoleLayout } from '@/shared/blocks/console/layout';

export default async function ActivityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('activity.sidebar');

  // settings title
  const title = t('title');

  // settings nav
  let nav = t.raw('nav');

  // Filter out hidden items from nav
  if (nav && nav.items && Array.isArray(nav.items)) {
    nav.items = nav.items.filter(
      (item: any) =>
        !item.url?.includes('/activity/chats') &&
        !item.url?.includes('/activity/ai-tasks')
    );
  }

  const topNav = t.raw('top_nav');

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
