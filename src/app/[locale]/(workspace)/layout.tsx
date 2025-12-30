import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  ThemeToggler,
} from '@/shared/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('landing');
  const header: HeaderType = t.raw('header');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Minimal Header */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b px-4 bg-muted/20">
        <div className="flex items-center gap-4">
           {/* Minimal Logo */}
           <div className="scale-75 origin-left">
             {header.brand && <BrandLogo brand={header.brand} />}
           </div>
        </div>

        <div className="flex items-center gap-3">
           <ThemeToggler />
           <LocaleSelector />
           {header.show_sign ? (
              <SignUser userNav={header.user_nav} />
           ) : null}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
